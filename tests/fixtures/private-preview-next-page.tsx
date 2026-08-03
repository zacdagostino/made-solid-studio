import { PrivatePreviewNavigation } from '@/components/site/private-preview-navigation';

export default function PrivatePreviewFixturePage() {
  return (
    <>
      <PrivatePreviewNavigation />
      <main>
        <h1>Interactive private preview</h1>
        <p>
          The compiled animation and mobile navigation runtimes must hydrate inside the preview.
        </p>
      </main>
    </>
  );
}
