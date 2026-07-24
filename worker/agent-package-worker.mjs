import { hostname } from 'node:os';
import { createClient } from '@supabase/supabase-js';

const timeoutMs = 120_000;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the agent package worker.`);
  return value;
}

function outputText(response) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }
  for (const item of response.output ?? []) {
    const text = item?.content?.find((entry) => entry?.type === 'output_text')?.text;
    if (typeof text === 'string' && text.trim()) return text;
  }
  throw new Error('The refinement model did not return structured output.');
}

function schema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'summary',
      'contractAddendum',
      'instructionsAddendum',
      'capabilityAssessment',
      'capabilityProposal',
    ],
    properties: {
      summary: { type: 'string', maxLength: 1200 },
      contractAddendum: { type: 'string', maxLength: 12000 },
      instructionsAddendum: { type: 'string', maxLength: 12000 },
      capabilityAssessment: {
        type: 'string',
        enum: ['policy_only', 'foundation_change_required'],
      },
      capabilityProposal: { type: 'string', maxLength: 2000 },
    },
  };
}

async function propose(apiKey, model, proposal, basePackage) {
  const prompt = [
    'You convert a human builder-agent refinement direction into a concise, reviewable package proposal.',
    'The output will be stored as immutable Markdown addenda to the existing builder contract and template instructions.',
    'Do not invent business facts, modify a Build Manifest, relax safety/evidence/accessibility boundaries, or describe hidden model reasoning.',
    'A direction may refine policy or implementation guidance. It must never silently add JavaScript, dependencies, or a new shared builder capability.',
    'If fulfilling the direction needs a changed runtime, template source file, dependency, or quality gate, set capabilityAssessment to foundation_change_required, explain the exact capability in capabilityProposal, and leave both addenda empty. Such a proposal requires a separate code change before it can be tested or promoted.',
    'If it can be handled through the existing builder foundation, set capabilityAssessment to policy_only, write only additive Markdown. Be precise about when to use or avoid a behaviour, and preserve reduced motion and factual-content boundaries.',
    'Do not repeat the base package verbatim. Return empty strings for any addendum that is not needed.',
    `Published base package: ${JSON.stringify({
      version: basePackage.version,
      builderContractVersion: basePackage.builder_contract_version,
      foundationVersion: basePackage.foundation_version,
      summary: basePackage.summary,
      contractAddendum: basePackage.contract_addendum,
      instructionsAddendum: basePackage.instructions_addendum,
    })}`,
    `Workspace member direction: ${proposal.direction}`,
  ].join('\n\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      store: false,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      text: {
        format: {
          type: 'json_schema',
          name: 'agent_package_proposal',
          strict: true,
          schema: schema(),
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`The refinement model returned ${response.status}.`);
  const body = await response.json();
  return { proposal: JSON.parse(outputText(body)), usage: body.usage };
}

async function processProposal(client, proposal, workerId, apiKey, model) {
  const { data: basePackage, error: packageError } = await client
    .from('agent_packages')
    .select('*')
    .eq('id', proposal.base_package_id)
    .eq('organization_id', proposal.organization_id)
    .single();
  if (packageError || !basePackage)
    throw new Error('The published base package could not be loaded.');

  const result = await propose(apiKey, model, proposal, basePackage);
  const output = result.proposal;
  const { error } = await client.rpc('complete_agent_package_proposal', {
    target_proposal_id: proposal.id,
    worker_identity: workerId,
    proposal_summary: output.summary,
    proposal_contract_addendum: output.contractAddendum,
    proposal_instructions_addendum: output.instructionsAddendum,
    proposal_capability_assessment: output.capabilityAssessment,
    proposal_capability_proposal: output.capabilityProposal,
    proposal_model: model,
  });
  if (error) throw error;
}

async function main() {
  const apiKey = requiredEnvironment('OPENAI_API_KEY');
  const client = createClient(
    requiredEnvironment('SITEFORGE_SUPABASE_URL'),
    requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const model = process.env.SITEFORGE_AGENT_PACKAGE_MODEL?.trim() || 'gpt-5.6';
  const workerId = `${hostname()}-${process.pid}`;
  const once = process.argv.includes('--once');

  while (true) {
    const { data, error } = await client.rpc('claim_next_agent_package_proposal', {
      worker_identity: workerId,
    });
    if (error) throw error;
    const proposal = Array.isArray(data) ? data[0] : undefined;
    if (!proposal) {
      if (once) return;
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      continue;
    }
    try {
      await processProposal(client, proposal, workerId, apiKey, model);
      console.log(`[agent-package-worker] completed ${proposal.id}`);
    } catch (error) {
      await client
        .from('agent_package_proposals')
        .update({
          status: 'failed',
          worker_id: null,
          lease_expires_at: null,
          error_summary:
            error instanceof Error ? error.message.slice(0, 500) : 'Agent package proposal failed.',
        })
        .eq('id', proposal.id)
        .eq('worker_id', workerId);
      console.error(
        '[agent-package-worker] failed',
        proposal.id,
        error instanceof Error ? error.message : error,
      );
      if (once) throw error;
    }
    if (once) return;
  }
}

main().catch((error) => {
  console.error(
    '[agent-package-worker] stopped unexpectedly',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
