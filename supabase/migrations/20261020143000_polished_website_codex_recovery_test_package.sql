insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.6, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.6', base.foundation_version, base.foundation_checksum,
  'The authenticated development website never paints an embedded Studio document until the exact iframe window at the configured Studio origin reports ready. A host-owned, geometry-matched connecting surface covers first open, tab restoration and foreground recovery. Offline, frame and bounded no-response failures become a branded recoverable state, so browser failure pages, Railway responses and the standalone Studio loader remain hidden.',
  'Keep the Studio iframe invisible and non-interactive until a ready-true message passes both exact-origin and exact-window validation. Preserve only the tab-scoped open or closed presentation state. While an open panel reconnects, render the accessible Clientspace-owned shell with a 44-pixel close control; after a bounded retry and deadline, show plain-language retry and close actions without exposing provider HTML. Retry with a fresh resume token, restore focus on host close, distinguish offline copy, respect reduced motion and remove the shell alongside the owner controls in nested client previews.',
  'Polished website Codex recovery test package: replaces raw Studio, browser and Railway failure pages with a trusted-ready loading shell and actionable retry experience.',
  'foundation_change_required',
  'Keeps unready cross-origin documents out of the owner experience while preserving automatic recovery, secure readiness validation and a clear manual retry path.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.5'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.6'
);
