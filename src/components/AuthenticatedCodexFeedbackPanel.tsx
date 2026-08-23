import { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured, usesLocalStorage } from '../lib/supabase';
import { CodexFeedbackPanel } from './CodexFeedbackPanel';

export function AuthenticatedCodexFeedbackPanel({
  embedded = false,
  workspaceDirectory,
}: {
  embedded?: boolean;
  workspaceDirectory?: string;
}) {
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured || usesLocalStorage);

  useEffect(() => {
    if (!isSupabaseConfigured || usesLocalStorage) return;
    const client = getSupabaseClient();
    if (!client) return;
    let active = true;

    void client.auth.getSession().then(({ data }) => {
      if (active) setAuthenticated(Boolean(data.session));
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthenticated(Boolean(session));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return authenticated ? (
    <CodexFeedbackPanel embedded={embedded} workspaceDirectory={workspaceDirectory} />
  ) : null;
}
