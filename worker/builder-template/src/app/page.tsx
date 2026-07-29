import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Private preview',
  other: {
    'siteforge-source-url': 'https://private-preview.invalid/locked-starter',
  },
};

export default function StarterPage() {
  return (
    <>
      <header className="starter-header">
        <img
          alt="Made Solid Studio preview"
          data-siteforge-brand-logo
          height="40"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='124' height='40' viewBox='0 0 124 40'%3E%3Crect width='124' height='40' rx='8' fill='%23173f35'/%3E%3Ccircle cx='22' cy='20' r='8' fill='%23c4703f'/%3E%3Cpath d='M42 14h66v4H42zm0 8h48v4H42z' fill='white'/%3E%3C/svg%3E"
          width="124"
        />
      </header>
      <main className="starter" data-siteforge-starter>
        <h1>Private preview</h1>
        <p>This route is replaced by the Made Solid Studio builder.</p>
      </main>
    </>
  );
}
