import { ClientPreviewPublicationPanel } from './App';
import type { ProspectWorkspace } from './lib/domain';

const builderRunId = '12345678-1234-1234-1234-123456789abc';
const fixtureWorkspace = {
  business: {
    id: 'business-ready-review',
    kind: 'prospect',
    name: 'Long Electrical & Civil Engineering',
  },
  contacts: [],
  builderRuns: [
    {
      id: builderRunId,
      buildMode: 'full_site',
      status: 'ready',
      qualitySummary: { status: 'passed' },
    },
  ],
  clientPreviewPublications: [
    {
      id: '87654321-4321-4321-4321-cba987654321',
      builderRunId,
      status: 'ready',
      progressPhase: 'ready',
      progressDetail: 'The private client review is ready.',
      totalItems: 5,
      completedItems: 5,
      deploymentUrl:
        'https://preview.madesolid.com.au/review/12345678-1234-1234-1234-123456789abc/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/',
    },
  ],
} as unknown as ProspectWorkspace;

export function ClientReviewRevocationFixture() {
  return (
    <ClientPreviewPublicationPanel
      onCancel={async () => {
        (window as Window & { __reviewRevoked?: boolean }).__reviewRevoked = true;
      }}
      onPublish={async () => undefined}
      workspace={fixtureWorkspace}
    />
  );
}
