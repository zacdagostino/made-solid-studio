import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BuildManifest, Business } from '../lib/domain';
import type { ProposalDraft } from '../lib/proposal-draft';
import {
  calculateBuildPricing,
  defaultPricingOptions,
  pricingQuoteExpired,
  type PricingQuoteSnapshot,
} from '../lib/pricing';
import { requestRehearsal } from '../lib/rehearsal-runtime';
import { PricingCalculator } from './PricingCalculator';
import { Button, ButtonGroup, ButtonLink, StatusBadge } from './ui';

type Rehearsal = {
  sourceBusinessId: string;
  sourceName: string;
  status: 'draft' | 'running' | 'ready' | 'failed';
  detail?: string;
  error?: string;
  adminUrl?: string;
  sourceHandoffId?: string;
};
type ClientspaceStatus = {
  accountCreated: boolean;
  contacted: boolean;
  invitationStatus: string;
  invitedAt?: string | null;
};
type Snapshot = {
  id: string;
  draft: ProposalDraft & { rehearsal: Rehearsal };
  clientspace?: ClientspaceStatus | null;
  source: { source_commit: string; source_edit_version: number };
  manifest: {
    id: string;
    business_id: string;
    redesign_brief_id: string;
    research_packet_id: string;
    crawl_run_id: string;
    schema_version: number;
    builder_contract_version: string;
    status: 'ready';
    data: BuildManifest['data'];
    generated_at: string;
    created_at: string;
    updated_at: string;
  };
};
type RehearsalLookup = { rehearsal: Snapshot | null };

async function request(input: Record<string, unknown>): Promise<Snapshot> {
  return requestRehearsal<Snapshot>(input);
}

export function CreateRehearsal({ business }: { business: Business }) {
  const id = useRef(crypto.randomUUID());
  const [email, setEmail] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await requestRehearsal<RehearsalLookup>({
        action: 'find',
        sourceBusinessId: business.id,
      });
      setSnapshot(result.rehearsal ?? undefined);
      if (result.rehearsal?.draft.clientEmail) setEmail(result.rehearsal.draft.clientEmail);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Studio could not check the saved Clientspace test.',
      );
    } finally {
      setLoading(false);
    }
  }, [business.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const rehearsal = snapshot?.draft.rehearsal;
  const clientspace = snapshot?.clientspace;
  const invitationSent = Boolean(
    clientspace?.contacted || ['sent', 'accepted'].includes(clientspace?.invitationStatus || ''),
  );
  const invitationSending = clientspace?.invitationStatus === 'sending';
  const invitationFailed = clientspace?.invitationStatus === 'failed';
  const status = !snapshot
    ? undefined
    : invitationSent
      ? {
          badge: 'Invitation sent',
          tone: 'success' as const,
          title: `Sent only to ${snapshot.draft.clientEmail}`,
          detail: clientspace?.invitedAt
            ? `Sent ${new Date(clientspace.invitedAt).toLocaleString('en-AU')}. The real client was not contacted.`
            : 'The test invitation was sent. The real client was not contacted.',
        }
      : invitationSending
        ? {
            badge: 'Sending test invitation',
            tone: 'warning' as const,
            title: `Sending only to ${snapshot.draft.clientEmail}`,
            detail:
              'Clientspace is sending the test invitation. Refresh this status to confirm delivery; the real client is not the recipient.',
          }
        : invitationFailed
          ? {
              badge: 'Test invitation not sent',
              tone: 'danger' as const,
              title: 'Clientspace could not send the test invitation',
              detail: `Nothing was delivered. Continue in Clientspace to retry the invitation to ${snapshot.draft.clientEmail}.`,
            }
          : clientspace?.accountCreated
            ? {
                badge: 'Clientspace created — nothing sent',
                tone: 'success' as const,
                title: 'Your private test Clientspace is ready',
                detail: `No invitation has been sent. When you choose to send one in Clientspace, it can only go to ${snapshot.draft.clientEmail}.`,
              }
            : rehearsal?.status === 'ready'
              ? {
                  badge: 'Ready — nothing sent',
                  tone: 'success' as const,
                  title: 'Continue the safe test in Clientspace',
                  detail: `The handoff is prepared, but no account or invitation has been created. The test recipient is ${snapshot.draft.clientEmail}.`,
                }
              : rehearsal?.status === 'running'
                ? {
                    badge: 'Preparing test',
                    tone: 'warning' as const,
                    title: 'Studio is preparing the private test',
                    detail:
                      rehearsal.detail || 'The verified website and test offer are being prepared.',
                  }
                : rehearsal?.status === 'failed'
                  ? {
                      badge: 'Test needs attention',
                      tone: 'danger' as const,
                      title: 'The safe test stopped before Clientspace was ready',
                      detail:
                        rehearsal.error || rehearsal.detail || 'Open the test setup to retry.',
                    }
                  : {
                      badge: 'Test started — nothing sent',
                      tone: 'neutral' as const,
                      title: 'Finish the test offer',
                      detail: `The private test exists for ${snapshot.draft.clientEmail}. No Clientspace or invitation has been created yet.`,
                    };

  return (
    <section className="clientspace-test-panel" aria-labelledby="clientspace-test-title">
      <header className="clientspace-test-panel__heading">
        <div>
          <StatusBadge tone="warning">Safe test · real client protected</StatusBadge>
          <h3 id="clientspace-test-title">Test {business.name} in Clientspace</h3>
          <p>
            Check the complete client experience using your own inbox. Billing and live launch stay
            disabled throughout the test.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="clientspace-test-panel__state" role="status">
          <strong>Checking your saved test…</strong>
          <span>Studio is confirming whether a test already exists.</span>
        </div>
      ) : error ? (
        <div className="clientspace-test-panel__state clientspace-test-panel__state--error">
          <strong>Studio couldn’t confirm the test status</strong>
          <span role="alert">{error}</span>
          <Button onClick={() => void load()} variant="secondary">
            Check again
          </Button>
        </div>
      ) : snapshot && status ? (
        <div className="clientspace-test-panel__state" aria-live="polite">
          <StatusBadge tone={status.tone}>{status.badge}</StatusBadge>
          <strong>{status.title}</strong>
          <span>{status.detail}</span>
          <dl className="clientspace-test-panel__facts">
            <div>
              <dt>Test recipient</dt>
              <dd>{snapshot.draft.clientEmail || 'Add your email in test setup'}</dd>
            </div>
            <div>
              <dt>Real client</dt>
              <dd>Not contacted by this test</dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>Verified edit v{snapshot.source.source_edit_version}</dd>
            </div>
          </dl>
          <ButtonGroup>
            {rehearsal?.adminUrl ? (
              <ButtonLink href={rehearsal.adminUrl} target="_blank" rel="noreferrer">
                {clientspace?.accountCreated ? 'Open test Clientspace' : 'Continue in Clientspace'}
              </ButtonLink>
            ) : (
              <ButtonLink href={`#/prospects/${snapshot.id}/handoff`}>
                Continue test setup
              </ButtonLink>
            )}
            <Button onClick={() => void load()} variant="secondary">
              Refresh status
            </Button>
          </ButtonGroup>
          <details className="clientspace-test-panel__advanced">
            <summary>Technical details</summary>
            <p>
              Internal test record {snapshot.id.slice(0, 8)} · source commit{' '}
              {snapshot.source.source_commit.slice(0, 8)}. It is hidden from the prospect pipeline.
            </p>
          </details>
        </div>
      ) : (
        <form
          className="clientspace-test-panel__state"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              const copy = await request({
                action: 'create',
                id: id.current,
                sourceBusinessId: business.id,
                clientEmail: email,
              });
              setSnapshot(copy);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'The safe test could not start.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <strong>No Clientspace test has been started</strong>
          <span>Starting one creates private test data only. It does not send an email.</span>
          <label>
            Your email for the test
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <Button disabled={busy} type="submit">
            {busy ? 'Starting safe test…' : 'Start safe test'}
          </Button>
          <small>
            Nothing is sent now. You’ll review the invitation separately in Clientspace.
          </small>
        </form>
      )}
    </section>
  );
}

export function RehearsalWorkspace({ businessId }: { businessId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [draft, setDraft] = useState<ProposalDraft>({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [quoteValid, setQuoteValid] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const result = await request({ action: 'load', id: businessId });
      setSnapshot(result);
      setDraft(result.draft);
      setDirty(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Loading failed.');
    }
  }, [businessId]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (snapshot?.draft.rehearsal.status !== 'running') return;
    const interval = setInterval(() => {
      void load();
    }, 3000);
    return () => clearInterval(interval);
  }, [load, snapshot?.draft.rehearsal.status]);
  const manifest = useMemo(
    () =>
      snapshot
        ? ({
            id: snapshot.manifest.id,
            businessId: snapshot.manifest.business_id,
            redesignBriefId: snapshot.manifest.redesign_brief_id,
            researchPacketId: snapshot.manifest.research_packet_id,
            crawlRunId: snapshot.manifest.crawl_run_id,
            schemaVersion: snapshot.manifest.schema_version,
            builderContractVersion: snapshot.manifest.builder_contract_version,
            status: snapshot.manifest.status,
            data: snapshot.manifest.data,
            generatedAt: snapshot.manifest.generated_at,
            createdAt: snapshot.manifest.created_at,
            updatedAt: snapshot.manifest.updated_at,
          } satisfies BuildManifest)
        : undefined,
    [snapshot],
  );
  const scope = useMemo(
    () =>
      manifest && snapshot
        ? {
            ...calculateBuildPricing(manifest, defaultPricingOptions).sourceScope,
            source: 'committed_source' as const,
            sourceCommit: snapshot.source.source_commit,
            sourceEditVersion: snapshot.source.source_edit_version,
            revisionLabel: `Reused website edit v${snapshot.source.source_edit_version}`,
          }
        : undefined,
    [manifest, snapshot],
  );
  const acceptQuote = useCallback((quote?: PricingQuoteSnapshot) => {
    setDraft((previous) => {
      if (JSON.stringify(previous.approvedQuote) === JSON.stringify(quote)) return previous;
      setDirty(true);
      return { ...previous, approvedQuote: quote };
    });
  }, []);
  async function act(action: 'save' | 'prepare') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request({ action, id: businessId, draft });
      setSnapshot(result);
      setDraft(result.draft);
      setDirty(false);
      setNotice(
        action === 'save'
          ? 'Test proposal saved. You can reload to check it.'
          : result.draft.rehearsal.detail || 'Rehearsal updated.',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The action failed. Your entries are still here.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (!snapshot)
    return (
      <section className="rehearsal-stack" aria-busy={!error}>
        <h2>Test rehearsal</h2>
        <p role={error ? 'alert' : 'status'}>{error || 'Loading your saved rehearsal…'}</p>
        {error && <Button onClick={() => void load()}>Retry loading</Button>}
      </section>
    );
  const rehearsal = snapshot.draft.rehearsal;
  const quoteExpired = Boolean(draft.approvedQuote && pricingQuoteExpired(draft.approvedQuote));
  return (
    <section className="rehearsal-stack" aria-label="Test rehearsal">
      <header className="rehearsal-heading">
        <div>
          <StatusBadge tone="warning">Safe test · real client protected</StatusBadge>
          <h2>{rehearsal.sourceName} Clientspace test</h2>
          <p>
            This copy has its own test contact, proposal and status. It references{' '}
            {rehearsal.sourceName}’s verified website edit v{snapshot.source.source_edit_version},
            while the original audit and release proof stay attached to the original prospect.
          </p>
        </div>
        <ButtonLink variant="secondary" href={`#/prospects/${rehearsal.sourceBusinessId}/handoff`}>
          Return to {rehearsal.sourceName}
        </ButtonLink>
      </header>
      <ol className="rehearsal-steps" aria-label="Rehearsal progress">
        <li className="is-complete">
          <strong>1 · Test details</strong>
          <span>Your inbox and a separate test offer</span>
        </li>
        <li className={draft.approvedQuote && quoteValid ? 'is-complete' : ''}>
          <strong>2 · Test proposal</strong>
          <span>
            {draft.approvedQuote && quoteValid
              ? 'Saved offer is ready'
              : draft.approvedQuote
                ? 'Saved offer needs reconfirmation'
                : 'Review and save an offer'}
          </span>
        </li>
        <li className={rehearsal.status === 'ready' ? 'is-complete' : ''}>
          <strong>3 · Safe Clientspace</strong>
          <span>
            {rehearsal.status === 'running'
              ? 'Preparing verified preview and test handoff…'
              : rehearsal.status === 'ready'
                ? 'Test handoff is ready'
                : 'Prepare when the proposal is saved'}
          </span>
        </li>
      </ol>
      {quoteExpired ? (
        <div className="rehearsal-recovery" role="alert">
          <div>
            <strong>Your saved test quote has expired</strong>
            <p>
              Issue a fresh 14-day approval below, then save the proposal. Nothing is sent and live
              billing remains disabled.
            </p>
          </div>
          <Button
            onClick={() => {
              const action = document.getElementById('reconfirm-test-quote');
              action?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              action?.focus({ preventScroll: true });
            }}
            type="button"
          >
            Review and reconfirm quote
          </Button>
        </div>
      ) : null}
      <form
        className="rehearsal-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void act('save');
        }}
      >
        <fieldset disabled={busy || rehearsal.status === 'running'} className="rehearsal-fields">
          <legend>Test client details</legend>
          {(
            [
              ['clientName', 'Test client name'],
              ['projectName', 'Test project name'],
              ['contactName', 'Contact name'],
              ['clientEmail', 'Your email for the test'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={draft[key] || ''}
                type={key === 'clientEmail' ? 'email' : 'text'}
                required={key !== 'contactName'}
                onChange={(event) => {
                  setDraft((previous) => ({ ...previous, [key]: event.target.value }));
                  setDirty(true);
                }}
              />
            </label>
          ))}
        </fieldset>
        <p className="rehearsal-note">
          All prices here are test data. Preparing the handoff creates no account and sends no
          invitation. Clientspace will show the next deliberate action.
        </p>
        <PricingCalculator
          expiredQuoteActionId="reconfirm-test-quote"
          manifest={manifest}
          sourceScope={scope}
          savedQuote={draft.approvedQuote}
          savedOptions={draft.pricingOptions}
          onApprovedQuoteChange={acceptQuote}
          onQuoteValidityChange={setQuoteValid}
          onOptionsChange={(options) => {
            setDraft((previous) => ({ ...previous, pricingOptions: options }));
            setDirty(true);
          }}
        />
        <ButtonGroup>
          <Button type="submit" disabled={busy || rehearsal.status === 'running'}>
            {busy ? 'Saving…' : 'Save test proposal'}
          </Button>
        </ButtonGroup>
      </form>
      <p role="status">
        {dirty
          ? 'You have unsaved changes. Save before preparing Clientspace.'
          : notice ||
            rehearsal.detail ||
            'Your test contact is saved. Approve and save a test quote to continue.'}
      </p>
      {(error || rehearsal.error) && <p role="alert">{error || rehearsal.error}</p>}
      <ButtonGroup>
        <Button
          disabled={
            busy || dirty || !draft.approvedQuote || !quoteValid || rehearsal.status === 'running'
          }
          onClick={() => void act('prepare')}
        >
          {busy || rehearsal.status === 'running'
            ? 'Preparing automatically…'
            : rehearsal.status === 'failed'
              ? 'Retry test handoff'
              : 'Prepare test Clientspace handoff'}
        </Button>
        {rehearsal.adminUrl && (
          <ButtonLink href={rehearsal.adminUrl} target="_blank" rel="noreferrer">
            Continue test in Clientspace
          </ButtonLink>
        )}
      </ButtonGroup>
      {!draft.approvedQuote ? (
        <p>Approve and save the test quote to enable the handoff.</p>
      ) : !quoteValid ? (
        <p>Reconfirm and save the unchanged quote to enable the handoff.</p>
      ) : null}
    </section>
  );
}
