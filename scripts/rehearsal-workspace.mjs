import { createClient } from '@supabase/supabase-js';

const uuid = /^[a-f0-9-]{36}$/i;
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const rehearsalLabel = 'TEST REHEARSAL';

async function loadClientspaceStatus(rehearsal, environment) {
  if (!rehearsal?.handoffId) return null;
  try {
    const endpoint = new URL(
      '/api/integrations/studio/rehearsals',
      environment.MADE_SOLID_HANDOFF_URL || environment.CLIENTSPACE_HANDOFF_URL,
    );
    endpoint.searchParams.set('rehearsalId', rehearsal.rehearsalId);
    endpoint.searchParams.set('sourceBusinessId', rehearsal.sourceBusinessId);
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${environment.MADE_SOLID_HANDOFF_SECRET || environment.CLIENTSPACE_HANDOFF_SECRET}`,
      },
    });
    if (!response.ok) return null;
    const result = await response.json();
    return {
      accountCreated: result.accountCreated === true,
      contacted: result.contacted === true,
      invitationStatus:
        typeof result.invitationStatus === 'string' ? result.invitationStatus : 'not_sent',
      invitedAt: typeof result.invitedAt === 'string' ? result.invitedAt : null,
    };
  } catch {
    return null;
  }
}

async function loadSourceHandoff(db, source) {
  const { data, error } = await db
    .from('made_solid_handoffs')
    .select('*')
    .eq('business_id', source.business_id)
    .eq('source_commit', source.source_commit)
    .maybeSingle();
  if (error) throw new Error('The verified website preview could not be checked.');
  return data;
}

async function queueSourceHandoff(db, source, draft, authorization) {
  let handoff = await loadSourceHandoff(db, source);
  if (
    handoff?.status === 'ready' ||
    (['queued', 'running'].includes(handoff?.status) && handoff.attempt_count < 3)
  ) {
    return handoff;
  }
  const { data: run, error: runError } = await db
    .from('builder_runs')
    .select('id,build_mode,build_manifest_id,agent_package_id')
    .eq('id', source.source_builder_run_id)
    .single();
  if (
    runError ||
    !run ||
    run.build_mode !== 'full_site' ||
    run.build_manifest_id !== source.source_manifest_id
  ) {
    throw new Error('The verified complete website source is unavailable for the rehearsal.');
  }
  const { data: publication, error: publicationError } = await db
    .from('github_workspace_publications')
    .select('github_repository_url')
    .eq('builder_run_id', run.id)
    .eq('status', 'ready')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    publicationError ||
    !publication?.github_repository_url ||
    publication.github_repository_url !== source.source_repository_url
  ) {
    throw new Error('The verified editable website source is unavailable for the rehearsal.');
  }
  const values = {
    organization_id: source.organization_id,
    business_id: source.business_id,
    builder_run_id: run.id,
    requested_by: authorization.userId,
    source_repository_url: source.source_repository_url,
    source_branch: source.source_branch,
    source_commit: source.source_commit,
    source_edit_version: source.source_edit_version,
    source_manifest_id: source.source_manifest_id,
    source_agent_package_id: run.agent_package_id,
    client_name: draft.clientName,
    contact_name: draft.contactName || '',
    client_email: draft.clientEmail,
    project_name: draft.projectName,
    handoff_notes:
      'TEST ONLY: prepare the verified private source preview needed by the Clientspace rehearsal. Do not contact the client.',
    pricing_snapshot: draft.approvedQuote,
    status: 'queued',
    progress_phase: 'queued',
    progress_detail: 'Waiting to prepare the verified website preview for this rehearsal.',
    completed_items: 0,
    cancel_requested_at: null,
    worker_id: null,
    lease_expires_at: null,
    website_handoff_id: null,
    website_admin_url: null,
    error_summary: null,
    attempt_count: 0,
    started_at: null,
    completed_at: null,
    updated_at: new Date().toISOString(),
  };
  if (handoff) {
    const { data, error } = await db
      .from('made_solid_handoffs')
      .update(values)
      .eq('id', handoff.id)
      .select('*')
      .single();
    if (error || !data) throw new Error('The verified website preview could not be queued.');
    return data;
  }
  const { data, error } = await db.from('made_solid_handoffs').insert(values).select('*').single();
  if (!error && data) return data;
  // A simultaneous request can win the unique source revision insert. Reuse that job.
  handoff = await loadSourceHandoff(db, source);
  if (!handoff) throw new Error('The verified website preview could not be queued.');
  return handoff;
}

export function validateRehearsalQuote(quote, source) {
  return Boolean(
    quote?.status === 'approved' &&
    quote.schemaVersion === 3 &&
    quote.sourceManifestId === source.source_manifest_id &&
    quote.sourceScope?.source === 'committed_source' &&
    quote.sourceScope.sourceCommit === source.source_commit &&
    quote.sourceScope.sourceEditVersion === source.source_edit_version &&
    Date.parse(quote.validUntil) > Date.now() &&
    Number.isSafeInteger(quote.totalCents) &&
    quote.totalCents >= 0,
  );
}

function rehearsalQuoteTermsMatchSource(quote, source) {
  return Boolean(
    quote?.status === 'approved' &&
    quote.schemaVersion === 3 &&
    quote.sourceManifestId === source.source_manifest_id &&
    quote.sourceScope?.source === 'committed_source' &&
    quote.sourceScope.sourceCommit === source.source_commit &&
    quote.sourceScope.sourceEditVersion === source.source_edit_version &&
    Number.isSafeInteger(quote.totalCents) &&
    quote.totalCents >= 0,
  );
}

export async function reconfirmRehearsalQuote(input, environment = process.env, now = new Date()) {
  if (!uuid.test(input?.rehearsalId || '') || !uuid.test(input?.requestId || '')) {
    throw new Error('Choose a valid Clientspace rehearsal quote.');
  }
  if (typeof input?.quoteReference !== 'string' || !input.quoteReference.trim()) {
    throw new Error('The expired quote reference is required.');
  }
  const db = createClient(
    environment.SITEFORGE_SUPABASE_URL,
    environment.SITEFORGE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: saved, error: savedError } = await db
    .from('proposal_drafts')
    .select('business_id,draft,updated_at')
    .eq('business_id', input.rehearsalId)
    .maybeSingle();
  const rehearsal = saved?.draft?.rehearsal;
  if (savedError || !saved || rehearsal?.schemaVersion !== 1) {
    throw new Error('The saved Studio rehearsal could not be found.');
  }
  const { data: source, error: sourceError } = await db
    .from('source_release_attestations')
    .select('*')
    .eq('id', rehearsal.releaseId)
    .maybeSingle();
  const quote = saved.draft.approvedQuote;
  if (
    sourceError ||
    !source ||
    source.business_id !== rehearsal.sourceBusinessId ||
    !rehearsalQuoteTermsMatchSource(quote, source)
  ) {
    throw new Error('The quote no longer matches the verified rehearsal source.');
  }
  const expectedReference = input.quoteReference.trim();
  const refreshedReference = `clientspace-${input.requestId}`;
  if (quote.quoteReference === refreshedReference) return { quote };
  if (quote.quoteReference !== expectedReference) {
    throw new Error('The rehearsal quote changed. Refresh Clientspace before trying again.');
  }
  if (Date.parse(quote.validUntil) > now.getTime()) {
    throw new Error('This rehearsal quote is already current.');
  }
  const approvedAt = now.toISOString();
  const refreshedQuote = {
    ...quote,
    quoteReference: refreshedReference,
    approvedAt,
    validUntil: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1_000).toISOString(),
  };
  const draft = {
    ...saved.draft,
    approvedQuote: refreshedQuote,
    rehearsal: {
      ...rehearsal,
      detail: 'Test quote reconfirmed in Clientspace. The invitation remains a separate action.',
      error: null,
    },
  };
  const { data: updated, error: updateError } = await db
    .from('proposal_drafts')
    .update({ draft, updated_at: approvedAt })
    .eq('business_id', input.rehearsalId)
    .eq('updated_at', saved.updated_at)
    .select('business_id');
  if (updateError || !updated?.length) {
    throw new Error('The rehearsal changed in another tab. Refresh Clientspace and try again.');
  }
  return { quote: refreshedQuote };
}

export async function rehearsalWorkspace(input, authorization, environment = process.env) {
  if (!authorization?.organizationId || !authorization?.userId) {
    throw new Error('Sign in as the Studio owner to prepare a rehearsal.');
  }
  const db = createClient(
    environment.SITEFORGE_SUPABASE_URL,
    environment.SITEFORGE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const organizationId = authorization.organizationId;
  async function one(table, id, column = 'id') {
    const { data, error } = await db.from(table).select('*').eq(column, id).single();
    if (error || !data)
      throw new Error(`The saved ${table.replaceAll('_', ' ')} record is unavailable.`);
    return data;
  }
  async function business(id) {
    if (!uuid.test(id || '')) throw new Error('Choose a valid prospect.');
    const row = await one('businesses', id);
    if (row.organization_id !== organizationId)
      throw new Error('This prospect belongs to another workspace.');
    return row;
  }
  async function saveDraft(id, draft) {
    const { error } = await db
      .from('proposal_drafts')
      .upsert({ business_id: id, draft, updated_at: new Date().toISOString() });
    if (error) throw new Error('The rehearsal could not be saved. Retry with this page open.');
  }
  async function findRehearsal(sourceBusinessId) {
    const { data: candidates, error: findError } = await db
      .from('proposal_drafts')
      .select('business_id,draft,updated_at')
      .contains('draft', {
        rehearsal: { schemaVersion: 1, sourceBusinessId },
      })
      .order('updated_at', { ascending: false })
      .limit(10);
    if (findError) throw new Error('The saved Clientspace test could not be checked.');
    return candidates?.find(
      (row) =>
        row.draft?.rehearsal?.schemaVersion === 1 &&
        row.draft.rehearsal.sourceBusinessId === sourceBusinessId,
    );
  }
  if (input.action === 'find') {
    const source = await business(input.sourceBusinessId);
    const candidate = await findRehearsal(source.id);
    if (!candidate) return { rehearsal: null };
    const snapshot = await rehearsalWorkspace(
      { action: 'load', id: candidate.business_id },
      authorization,
      environment,
    );
    return { rehearsal: snapshot };
  }
  if (input.action === 'create') {
    const source = await business(input.sourceBusinessId);
    if (!uuid.test(input.id || '')) throw new Error('The rehearsal needs a stable identifier.');
    if (!email.test(input.clientEmail || '')) throw new Error('Enter your email for the test.');
    const existingRehearsal = await findRehearsal(source.id);
    if (existingRehearsal) {
      return rehearsalWorkspace(
        { action: 'load', id: existingRehearsal.business_id },
        authorization,
        environment,
      );
    }
    const { data: existing } = await db
      .from('businesses')
      .select('id')
      .eq('id', input.id)
      .maybeSingle();
    if (existing)
      return rehearsalWorkspace({ action: 'load', id: input.id }, authorization, environment);
    const { data: parentDraft } = await db
      .from('proposal_drafts')
      .select('draft')
      .eq('business_id', source.id)
      .maybeSingle();
    if (parentDraft?.draft?.rehearsal)
      throw new Error('Create the rehearsal from the original prospect.');
    const { data: reports, error } = await db
      .from('decision_report_versions')
      .select('id,data')
      .eq('business_id', source.id)
      .eq('schema_version', 10)
      .eq('review_state', 'approved')
      .order('version', { ascending: false })
      .limit(1);
    const report = reports?.[0];
    if (error || !report?.data?.redesign?.attestationRowId) {
      throw new Error(
        'The original prospect needs a verified website and current report before it can be reused.',
      );
    }
    const attestation = await one(
      'source_release_attestations',
      report.data.redesign.attestationRowId,
    );
    if (
      attestation.business_id !== source.id ||
      attestation.attestation_id !== report.data.redesign.attestationId
    ) {
      throw new Error('The original report and website verification do not match.');
    }
    const name = `${source.name} — ${rehearsalLabel}`;
    const { error: createError } = await db.from('businesses').insert({
      id: input.id,
      organization_id: organizationId,
      kind: 'prospect',
      name,
      stage: 'proposal',
      review_state: 'needs_review',
    });
    if (createError) throw new Error('The test prospect could not be created.');
    try {
      await saveDraft(input.id, {
        clientName: name,
        projectName: `${source.name} website — TEST ONLY`,
        contactName: '',
        clientEmail: input.clientEmail.trim().toLowerCase(),
        rehearsal: {
          schemaVersion: 1,
          sourceBusinessId: source.id,
          sourceName: source.name,
          reportId: report.id,
          releaseId: attestation.id,
          status: 'draft',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      await db.from('businesses').delete().eq('id', input.id).eq('organization_id', organizationId);
      throw error;
    }
    return rehearsalWorkspace({ action: 'load', id: input.id }, authorization, environment);
  }
  const target = await business(input.id);
  const saved = await one('proposal_drafts', target.id, 'business_id');
  const draft = saved.draft;
  const rehearsal = draft?.rehearsal;
  if (rehearsal?.schemaVersion !== 1 || rehearsal.sourceBusinessId === target.id) {
    throw new Error('This prospect is not a rehearsal copy.');
  }
  await business(rehearsal.sourceBusinessId);
  const source = await one('source_release_attestations', rehearsal.releaseId);
  const report = await one('decision_report_versions', rehearsal.reportId);
  if (
    source.business_id !== rehearsal.sourceBusinessId ||
    report.business_id !== source.business_id ||
    report.data?.redesign?.attestationId !== source.attestation_id ||
    report.data?.redesign?.sourceCommit !== source.source_commit
  ) {
    throw new Error('The linked source evidence has changed. Create a new rehearsal copy.');
  }
  if (input.action === 'load' && rehearsal.status === 'running' && rehearsal.sourceHandoffId) {
    const sourceHandoff = await loadSourceHandoff(db, source);
    if (!sourceHandoff || sourceHandoff.id !== rehearsal.sourceHandoffId) {
      draft.rehearsal = {
        ...rehearsal,
        status: 'failed',
        detail: 'The verified website preview could not be confirmed.',
        error: 'Retry the test handoff. Your saved proposal and approved quote are safe.',
      };
      await saveDraft(target.id, draft);
    } else if (sourceHandoff.status === 'ready') {
      return rehearsalWorkspace({ action: 'prepare', id: target.id }, authorization, environment);
    } else if (['failed', 'cancelled'].includes(sourceHandoff.status)) {
      draft.rehearsal = {
        ...rehearsal,
        status: 'failed',
        detail: 'The verified website preview stopped before Clientspace preparation.',
        error:
          sourceHandoff.error_summary ||
          'Retry the test handoff. Your saved proposal and approved quote are safe.',
      };
      await saveDraft(target.id, draft);
    } else if (sourceHandoff.progress_detail !== rehearsal.detail) {
      draft.rehearsal = {
        ...rehearsal,
        detail: sourceHandoff.progress_detail,
      };
      await saveDraft(target.id, draft);
    }
  }
  if (input.action === 'save') {
    if (rehearsal.status === 'running' && Date.now() - Date.parse(rehearsal.startedAt) < 90_000) {
      throw new Error('Wait for the current handoff request before editing the saved proposal.');
    }
    if (!email.test(input.draft?.clientEmail || ''))
      throw new Error('Enter your email for the test.');
    const fields = {};
    for (const key of ['clientName', 'contactName', 'clientEmail', 'projectName']) {
      const value = input.draft[key];
      if (typeof value !== 'string' || value.length > 200)
        throw new Error('Check the test contact details.');
      fields[key] = value.trim();
    }
    if (!fields.clientName || !fields.projectName)
      throw new Error('Client and project names are required.');
    if (input.draft.approvedQuote && !validateRehearsalQuote(input.draft.approvedQuote, source)) {
      throw new Error('Approve a current test quote for the reused website version.');
    }
    Object.assign(draft, fields, {
      pricingOptions: input.draft.pricingOptions,
      approvedQuote: input.draft.approvedQuote,
    });
    draft.rehearsal = {
      ...rehearsal,
      status: 'draft',
      error: null,
      detail: 'Proposal saved. Prepare the test handoff to update Clientspace.',
    };
    await saveDraft(target.id, draft);
  } else if (input.action === 'prepare') {
    if (!validateRehearsalQuote(draft.approvedQuote, source))
      throw new Error('Save and approve the test quote first.');
    const sourceHandoff = await queueSourceHandoff(
      db,
      source,
      {
        clientName: rehearsal.sourceName,
        contactName: '',
        clientEmail: '',
        projectName: `${rehearsal.sourceName} website`,
        approvedQuote: draft.approvedQuote,
      },
      authorization,
    );
    if (sourceHandoff.status !== 'ready') {
      draft.rehearsal = {
        ...rehearsal,
        status: 'running',
        startedAt: new Date().toISOString(),
        sourceHandoffId: sourceHandoff.id,
        detail: sourceHandoff.progress_detail,
        error: null,
      };
      await saveDraft(target.id, draft);
      return {
        id: target.id,
        draft,
        source: {
          source_commit: source.source_commit,
          source_edit_version: source.source_edit_version,
          source_manifest_id: source.source_manifest_id,
        },
        manifest: await one('build_manifests', source.source_manifest_id),
      };
    }
    // Compare-and-set claim survives reloads and prevents duplicate requests from separate tabs.
    const claim = {
      ...draft,
      rehearsal: {
        ...rehearsal,
        status: 'running',
        startedAt: new Date().toISOString(),
        detail: 'Preparing the private Clientspace rehearsal.',
        error: null,
      },
    };
    if (
      rehearsal.status === 'running' &&
      !rehearsal.sourceHandoffId &&
      Date.now() - Date.parse(rehearsal.startedAt) < 90_000
    ) {
      return {
        id: target.id,
        draft,
        source: {
          source_commit: source.source_commit,
          source_edit_version: source.source_edit_version,
        },
        manifest: await one('build_manifests', source.source_manifest_id),
      };
    }
    const { data: claimed, error: claimError } = await db
      .from('proposal_drafts')
      .update({ draft: claim, updated_at: new Date().toISOString() })
      .eq('business_id', target.id)
      .eq('updated_at', saved.updated_at)
      .select('business_id');
    if (claimError || !claimed?.length)
      throw new Error('The rehearsal changed in another tab. Reload and retry.');
    try {
      const endpoint = new URL(
        '/api/integrations/studio/rehearsals',
        environment.MADE_SOLID_HANDOFF_URL || environment.CLIENTSPACE_HANDOFF_URL,
      );
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(60_000),
        headers: {
          Authorization: `Bearer ${environment.MADE_SOLID_HANDOFF_SECRET || environment.CLIENTSPACE_HANDOFF_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rehearsalId: target.id,
          sourceBusinessId: source.business_id,
          sourceRepositoryUrl: source.source_repository_url,
          sourceBuilderRunId: source.source_builder_run_id,
          sourceManifestId: source.source_manifest_id,
          sourceCommit: source.source_commit,
          sourceEditVersion: source.source_edit_version,
          sourceBranch: source.source_branch,
          releaseAttestation: {
            ...source.attestation,
            digest: source.attestation_digest,
          },
          report: report.data,
          clientName: draft.clientName,
          contactName: draft.contactName,
          clientEmail: draft.clientEmail,
          projectName: draft.projectName,
          pricingSnapshot: draft.approvedQuote,
        }),
      });
      const result = await response.json().catch(() => ({
        message:
          'Clientspace did not return a valid response. The saved proposal is safe to retry.',
      }));
      if (!response.ok)
        throw new Error(result.message || 'Clientspace could not receive the rehearsal.');
      const adminUrl = new URL(result.adminUrl);
      if (adminUrl.origin !== endpoint.origin || adminUrl.pathname !== '/admin')
        throw new Error('Clientspace returned an invalid link.');
      draft.rehearsal = {
        ...rehearsal,
        status: 'ready',
        rehearsalId: target.id,
        adminUrl: adminUrl.href,
        handoffId: result.handoffId,
        detail:
          'Test handoff saved in Clientspace. Create the test workspace there, then send its invitation only when you are ready to test your inbox. Billing and live launch stay blocked.',
        error: null,
      };
      await saveDraft(target.id, draft);
    } catch (error) {
      draft.rehearsal = {
        ...rehearsal,
        status: 'failed',
        error: error.message,
        detail: 'The test handoff stopped. Your saved proposal is available to retry.',
      };
      await saveDraft(target.id, draft);
    }
  } else if (input.action !== 'load') throw new Error('Choose a supported rehearsal action.');
  const clientspace = await loadClientspaceStatus(
    { ...draft.rehearsal, rehearsalId: target.id },
    environment,
  );
  // Evidence is returned in its original identity, never rewritten to match the test prospect.
  return {
    id: target.id,
    draft,
    clientspace,
    source: {
      source_commit: source.source_commit,
      source_edit_version: source.source_edit_version,
      source_manifest_id: source.source_manifest_id,
    },
    manifest: await one('build_manifests', source.source_manifest_id),
  };
}
