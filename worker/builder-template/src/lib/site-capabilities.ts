export type ProductionRuntimeProfile =
  'static-marketing' | 'managed-forms' | 'managed-next-runtime';

export type IntegrationMode = 'preview' | 'managed-adapter';

export type SiteCapability = {
  id: string;
  kind: 'content' | 'form' | 'booking' | 'commerce' | 'identity' | 'integration';
  mode: IntegrationMode;
  productionService?: string;
};

export function previewSubmissionMessage(capability: SiteCapability) {
  if (capability.mode === 'managed-adapter') {
    return 'This private preview demonstrates the approved visitor flow. A reviewed production adapter is required before submissions are enabled.';
  }
  return 'This private preview does not send information.';
}
