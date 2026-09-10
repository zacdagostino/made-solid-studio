import { useCallback, useEffect, useRef, useState } from 'react';
import { readProposalDraft, saveProposalDraft, type ProposalDraft } from '../lib/proposal-draft';

export function useProposalDraft(businessId: string) {
  const [draft, setDraft] = useState<ProposalDraft>({});
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const loaded = useRef(false);
  const current = useRef(draft);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    if (loaded.current) return;
    setStatus('loading');
    void readProposalDraft(businessId)
      .then((value) => {
        if (!active) return;
        current.current = value;
        setDraft(value);
        loaded.current = true;
        setError('');
        setStatus('saved');
      })
      .catch((reason: Error) => {
        if (active) {
          setError(reason.message);
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [businessId, attempt]);

  const save = useCallback(
    (value: ProposalDraft) => {
      const id = ++generation.current;
      setStatus('saving');
      // Serialize writes so slow requests cannot overwrite a newer edit.
      pending.current = pending.current
        .catch(() => undefined)
        .then(() => saveProposalDraft(businessId, value));
      void pending.current
        .then(() => {
          if (id === generation.current) {
            setStatus('saved');
            setError('');
          }
        })
        .catch((reason: Error) => {
          if (id === generation.current) {
            setStatus('error');
            setError(reason.message);
          }
        });
    },
    [businessId],
  );

  const update = useCallback(
    (patch: Partial<ProposalDraft>) => {
      if (!loaded.current) return;
      current.current = { ...current.current, ...patch };
      setDraft(current.current);
      save(current.current);
    },
    [save],
  );

  return {
    draft,
    status,
    error,
    loaded: loaded.current,
    update,
    retry: () => (loaded.current ? save(current.current) : setAttempt((value) => value + 1)),
  };
}
