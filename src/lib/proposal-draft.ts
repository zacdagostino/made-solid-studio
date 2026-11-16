import type { PricingOptions, PricingQuoteSnapshot } from './pricing';
import { getSupabaseClient, usesLocalStorage } from './supabase';

export type ProposalDraft = {
  clientName?: string;
  contactName?: string;
  clientEmail?: string;
  projectName?: string;
  handoffNotes?: string;
  pricingOptions?: PricingOptions;
  approvedQuote?: PricingQuoteSnapshot;
  clientspaceBalanceRevision?: {
    schemaVersion: 1;
    id: string;
    requestId: string;
    clientspaceProjectId: string;
    clientspaceHandoffId: string;
    previousBalanceCents: number;
    balanceCents: number;
    currency: 'AUD';
    reason: string;
    quoteReference: string;
    createdAt: string;
    syncedAt: string;
  };
};

export async function readProposalDraft(businessId: string): Promise<ProposalDraft> {
  const client = usesLocalStorage ? undefined : getSupabaseClient();
  if (!client) return JSON.parse(localStorage.getItem(`proposal-draft:${businessId}`) || '{}');
  const { data, error } = await client
    .from('proposal_drafts')
    .select('draft')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw new Error('Your saved proposal could not be loaded. Retry before editing it.');
  return (data?.draft ?? {}) as ProposalDraft;
}

export async function saveProposalDraft(businessId: string, draft: ProposalDraft) {
  const client = usesLocalStorage ? undefined : getSupabaseClient();
  if (!client) {
    localStorage.setItem(`proposal-draft:${businessId}`, JSON.stringify(draft));
    return;
  }
  const { error } = await client
    .from('proposal_drafts')
    .upsert({ business_id: businessId, draft, updated_at: new Date().toISOString() });
  if (error)
    throw new Error('Proposal changes have not been saved. Keep this page open and retry.');
}
