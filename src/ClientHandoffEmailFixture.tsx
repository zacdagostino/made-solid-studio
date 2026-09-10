import { ClientPreviewPublicationPanel } from './App';
import type { ProspectWorkspace } from './lib/domain';

const captureId = 'capture-client-email';
const builderRunId = '12345678-1234-1234-1234-123456789abc';
const capturedAt = '2026-09-06T10:00:00.000Z';
const fixtureWorkspace = {
  business: {
    id: 'business-client-email',
    kind: 'prospect',
    name: 'Long Electrical & Civil Engineering',
  },
  website: {
    url: 'https://lece.example',
  },
  contacts: [],
  facts: [
    {
      id: 'fact-client-email-info',
      businessId: 'business-client-email',
      crawlRunId: captureId,
      label: 'Contact email',
      value: 'info@lece.example',
      sourceUrl: 'https://lece.example/contact-us',
      evidence: 'Captured from public page content.',
      confidence: 'high',
      verificationState: 'captured',
      capturedAt,
    },
    {
      id: 'fact-client-email-director',
      businessId: 'business-client-email',
      crawlRunId: captureId,
      label: 'Contact email',
      value: 'director@lece.example',
      sourceUrl: 'https://lece.example/about',
      evidence: 'Captured from public page content.',
      confidence: 'high',
      verificationState: 'captured',
      capturedAt,
    },
  ],
  researchPacket: {
    id: 'packet-client-email',
    businessId: 'business-client-email',
    crawlRunId: captureId,
    schemaVersion: 3,
    data: {
      business: {
        publicContacts: { emails: ['director@lece.example', 'info@lece.example'] },
      },
    },
    generatedAt: capturedAt,
  },
  builderRuns: [
    {
      id: builderRunId,
      buildMode: 'full_site',
      status: 'ready',
      qualitySummary: { status: 'passed' },
    },
  ],
  clientPreviewPublications: [],
} as unknown as ProspectWorkspace;

export function ClientHandoffEmailFixture() {
  return (
    <ClientPreviewPublicationPanel
      onCancel={async () => undefined}
      onPublish={async () => undefined}
      workspace={fixtureWorkspace}
    />
  );
}
