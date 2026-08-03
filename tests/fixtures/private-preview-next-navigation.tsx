'use client';

import { useEffect, useRef, useState } from 'react';

export function PrivatePreviewNavigation() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);

  return (
    <header>
      <button
        aria-expanded={open}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        data-siteforge-menu-trigger
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" />
        </svg>
      </button>
      {open ? (
        <div aria-label="Mobile navigation" data-siteforge-navigation-dialog role="dialog">
          <button
            aria-label="Close navigation"
            data-siteforge-navigation-close
            onClick={() => {
              setOpen(false);
              requestAnimationFrame(() => triggerRef.current?.focus());
            }}
            ref={closeRef}
            type="button"
          >
            Close
          </button>
          <nav aria-label="Primary navigation">
            <a href="/">Home</a>
            <a href="/services/">Services</a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
