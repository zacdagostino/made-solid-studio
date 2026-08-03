import * as Dialog from '@radix-ui/react-dialog';
import {
  Bot,
  CalendarDays,
  Database,
  LoaderCircle,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Button, IconButton } from './ui';

export type AppPage = 'today' | 'prospects' | 'agent-studio' | 'usage' | 'data' | 'settings';
type Theme = 'light' | 'dark';

const themeStorageKey = 'siteforge-os.theme';

const navigation = [
  { page: 'today' as const, label: 'Today', icon: CalendarDays },
  { page: 'prospects' as const, label: 'Prospects', icon: UsersRound },
  { page: 'agent-studio' as const, label: 'Agent Studio', icon: Bot },
  { page: 'usage' as const, label: 'AI usage', icon: WalletCards },
  { page: 'data' as const, label: 'Data', icon: Database },
  { page: 'settings' as const, label: 'Settings', icon: Settings },
];

function Navigation({
  activePage,
  onNavigate,
}: {
  activePage: AppPage;
  onNavigate?: (page: AppPage) => void;
}) {
  return (
    <nav aria-label="Primary navigation" className="navigation-list">
      {navigation.map(({ page, label, icon: Icon }) => (
        <button
          aria-current={activePage === page ? 'page' : undefined}
          className={
            activePage === page
              ? 'navigation-list__item navigation-list__item--active'
              : 'navigation-list__item'
          }
          key={page}
          onClick={() => onNavigate?.(page)}
          type="button"
        >
          <Icon aria-hidden="true" size={17} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function Brand({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className={hidden ? 'brand brand--loading-hidden' : 'brand'}>
      <span aria-hidden="true" className="brand__mark" />
      <span>
        <strong>
          <span>Made Solid</span> <span className="brand__studio">Studio</span>
        </strong>
        <small>Website operations</small>
      </span>
    </div>
  );
}

function preferredTheme(): Theme {
  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  } catch {
    // Appearance preference is optional; use the system setting when it cannot be stored.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function AppearanceControl({ theme, onThemeChange }: { theme: Theme; onThemeChange: () => void }) {
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <Button
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'dark'}
      className="appearance-control"
      onClick={onThemeChange}
      variant="quiet"
    >
      {theme === 'light' ? (
        <Moon aria-hidden="true" size={18} />
      ) : (
        <Sun aria-hidden="true" size={18} />
      )}
      <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
    </Button>
  );
}

function accountInitials(email: string) {
  const accountName = email.split('@')[0] || email;
  const words = accountName.split(/[._-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function AccountControl({
  userEmail,
  onSignOut,
}: {
  userEmail?: string;
  onSignOut?: () => Promise<void>;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  if (!userEmail || !onSignOut) return null;
  const signOutAction = onSignOut;

  async function signOut() {
    setSigningOut(true);
    setError('');
    try {
      await signOutAction();
    } catch {
      setError('We could not sign you out. Please try again.');
      setSigningOut(false);
    }
  }

  return (
    <section aria-label="Account" className="account-control">
      <div className="account-control__identity" title={userEmail}>
        <span aria-hidden="true" className="account-control__avatar">
          {accountInitials(userEmail)}
        </span>
        <span className="account-control__email">{userEmail}</span>
      </div>
      <IconButton
        className="account-control__sign-out"
        disabled={signingOut}
        label={signingOut ? 'Signing out' : 'Sign out'}
        onClick={() => void signOut()}
        variant="quiet"
      >
        <LogOut aria-hidden="true" size={18} />
      </IconButton>
      {error ? (
        <p className="account-control__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function AppShell({
  activePage = 'today',
  children,
  contentKey,
  isHydrating = false,
  onNavigate,
  onSignOut,
  userEmail,
  isLoading = false,
}: PropsWithChildren<{
  activePage?: AppPage;
  /** Remounts the content transition when the active route or workspace section changes. */
  contentKey?: string;
  isHydrating?: boolean;
  onNavigate?: (page: AppPage) => void;
  onSignOut?: () => Promise<void>;
  userEmail?: string;
  isLoading?: boolean;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(preferredTheme);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch {
      // The selected appearance remains active for this session when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [contentKey]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand hidden={isLoading} />
        <Navigation activePage={activePage} onNavigate={onNavigate} />
        <div className="navigation-footer">
          <AppearanceControl
            onThemeChange={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            theme={theme}
          />
          <AccountControl onSignOut={onSignOut} userEmail={userEmail} />
        </div>
      </aside>

      <header className="mobile-header">
        <Dialog.Root onOpenChange={setMenuOpen} open={menuOpen}>
          <Dialog.Trigger asChild>
            <IconButton
              className="mobile-menu-trigger"
              label="Open navigation menu"
              ref={menuTriggerRef}
              variant="quiet"
            >
              <Menu aria-hidden="true" size={20} />
            </IconButton>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="navigation-overlay" />
            <Dialog.Content
              aria-describedby={undefined}
              className="navigation-drawer"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                menuTriggerRef.current?.focus();
              }}
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <div className="drawer-header">
                <Brand hidden={isLoading} />
                <Dialog.Close asChild>
                  <IconButton label="Close navigation menu" variant="quiet">
                    <X aria-hidden="true" size={20} />
                  </IconButton>
                </Dialog.Close>
              </div>
              <Navigation
                activePage={activePage}
                onNavigate={(page) => {
                  onNavigate?.(page);
                  setMenuOpen(false);
                }}
              />
              <div className="navigation-footer">
                <AppearanceControl
                  onThemeChange={() =>
                    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
                  }
                  theme={theme}
                />
                <AccountControl onSignOut={onSignOut} userEmail={userEmail} />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <Brand hidden={isLoading} />
      </header>

      {isHydrating ? (
        <div
          aria-label="Refreshing workspace data"
          aria-live="polite"
          className="workspace-sync-status"
          role="status"
        >
          <LoaderCircle aria-hidden="true" size={16} />
          <span>Syncing workspace</span>
        </div>
      ) : null}

      <main ref={mainRef}>
        <div className="page-transition" key={contentKey}>
          {children}
        </div>
      </main>
    </div>
  );
}
