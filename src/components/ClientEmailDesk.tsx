import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  Inbox,
  MailPlus,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { ProspectWorkspace } from '../lib/domain';
import {
  createSuggestedReply,
  emailContextSnapshot,
  reviseSuggestedReply,
  sampleInboundEmails,
  type SuggestedEmailDraft,
  type TestInboundEmail,
} from '../lib/email-copilot';
import { Button, ButtonGroup, Eyebrow, IconButton, StatusBadge } from './ui';

type SavedEmailDesk = {
  emails: TestInboundEmail[];
  drafts: Record<string, SuggestedEmailDraft>;
  reviewedIds: string[];
};

function storageKey(businessId: string) {
  return `made-solid.email-desk.${businessId}.v1`;
}

function initialDesk(workspace: ProspectWorkspace): SavedEmailDesk {
  const emails = sampleInboundEmails(workspace);
  return {
    emails,
    drafts: Object.fromEntries(
      emails.map((email) => [email.id, createSuggestedReply(workspace, email)]),
    ),
    reviewedIds: [],
  };
}

function loadDesk(workspace: ProspectWorkspace): SavedEmailDesk {
  try {
    const stored = window.localStorage.getItem(storageKey(workspace.business.id));
    if (stored) return JSON.parse(stored) as SavedEmailDesk;
  } catch {
    // The test inbox remains usable when browser storage is unavailable.
  }
  return initialDesk(workspace);
}

function receivedLabel(value: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(value));
}

export function ClientEmailDesk({ workspace }: { workspace: ProspectWorkspace }) {
  const [desk, setDesk] = useState(() => loadDesk(workspace));
  const [loadedBusinessId, setLoadedBusinessId] = useState(workspace.business.id);
  const [selectedId, setSelectedId] = useState(desk.emails[0]?.id || '');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [revisionInstruction, setRevisionInstruction] = useState('');
  const [draftVersion, setDraftVersion] = useState(1);
  const [previousDraft, setPreviousDraft] = useState<SuggestedEmailDraft>();
  const [notice, setNotice] = useState(
    `${desk.emails.length} test ${desk.emails.length === 1 ? 'reply is' : 'replies are'} ready for your review.`,
  );
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testFromName, setTestFromName] = useState('Taylor Reed');
  const [testFromEmail, setTestFromEmail] = useState('taylor@dummy-client.example');
  const [testSubject, setTestSubject] = useState('Question before we move ahead');
  const [testBody, setTestBody] = useState(
    'Thanks for the preview. Can you explain the next step and whether the timing is flexible?',
  );
  const addTestEmailRef = useRef<HTMLButtonElement>(null);
  const selectedEmail = desk.emails.find((email) => email.id === selectedId) ?? desk.emails[0];
  const selectedDraft = selectedEmail ? desk.drafts[selectedEmail.id] : undefined;
  const isReviewed = selectedEmail ? desk.reviewedIds.includes(selectedEmail.id) : false;
  const needsReviewCount = desk.emails.filter(
    (email) => !desk.reviewedIds.includes(email.id),
  ).length;
  const context = useMemo(() => emailContextSnapshot(workspace), [workspace]);

  useEffect(() => {
    if (loadedBusinessId !== workspace.business.id) return;
    try {
      window.localStorage.setItem(storageKey(workspace.business.id), JSON.stringify(desk));
    } catch {
      // Draft state still remains available for the current session.
    }
  }, [desk, loadedBusinessId, workspace.business.id]);

  useEffect(() => {
    const next = loadDesk(workspace);
    setLoadedBusinessId(workspace.business.id);
    setDesk(next);
    setSelectedId(next.emails[0]?.id || '');
    setMobileDetailOpen(false);
  }, [workspace.business.id]);

  function selectEmail(email: TestInboundEmail) {
    setSelectedId(email.id);
    setMobileDetailOpen(true);
    setPreviousDraft(undefined);
    setDraftVersion(1);
    setRevisionInstruction('');
  }

  function updateDraft(patch: Partial<SuggestedEmailDraft>) {
    if (!selectedEmail || !selectedDraft) return;
    setDesk((current) => ({
      ...current,
      drafts: {
        ...current.drafts,
        [selectedEmail.id]: { ...selectedDraft, ...patch },
      },
      reviewedIds: current.reviewedIds.filter((id) => id !== selectedEmail.id),
    }));
    setNotice('Direct edit saved locally. This reply still needs your review.');
  }

  function reviseDraft(instruction = revisionInstruction) {
    if (!selectedEmail || !selectedDraft || !instruction.trim()) return;
    setPreviousDraft(selectedDraft);
    const revision = reviseSuggestedReply(selectedDraft, instruction);
    setDesk((current) => ({
      ...current,
      drafts: { ...current.drafts, [selectedEmail.id]: revision },
      reviewedIds: current.reviewedIds.filter((id) => id !== selectedEmail.id),
    }));
    setDraftVersion((version) => version + 1);
    setRevisionInstruction('');
    setNotice(`Draft revised from your instruction: “${instruction.trim()}”. Review before use.`);
  }

  function undoRevision() {
    if (!selectedEmail || !previousDraft) return;
    setDesk((current) => ({
      ...current,
      drafts: { ...current.drafts, [selectedEmail.id]: previousDraft },
    }));
    setPreviousDraft(undefined);
    setDraftVersion((version) => Math.max(1, version - 1));
    setNotice('The previous draft has been restored.');
  }

  function markReviewed() {
    if (!selectedEmail) return;
    setDesk((current) => ({
      ...current,
      reviewedIds: [...new Set([...current.reviewedIds, selectedEmail.id])],
    }));
    setNotice('Reply marked reviewed. Test mode never sends email.');
  }

  function addTestEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email: TestInboundEmail = {
      id: `test-${Date.now()}`,
      fromName: testFromName.trim(),
      fromEmail: testFromEmail.trim(),
      subject: testSubject.trim(),
      body: testBody.trim(),
      receivedAt: new Date().toISOString(),
      scenario: 'custom',
      isTest: true,
    };
    const draft = createSuggestedReply(workspace, email);
    setDesk((current) => ({
      emails: [email, ...current.emails],
      drafts: { ...current.drafts, [email.id]: draft },
      reviewedIds: current.reviewedIds,
    }));
    setSelectedId(email.id);
    setMobileDetailOpen(true);
    setTestDialogOpen(false);
    setNotice(`Test email from ${email.fromName} received. A contextual reply is ready to review.`);
  }

  return (
    <section className="email-desk" aria-labelledby="email-desk-title">
      <header className="email-desk__header">
        <div>
          <Eyebrow>Context-aware inbox</Eyebrow>
          <h2 id="email-desk-title">Client email desk</h2>
          <p>
            Incoming messages become review-only replies using this prospect’s saved state. Nothing
            is sent automatically.
          </p>
        </div>
        <Button onClick={() => setTestDialogOpen(true)} ref={addTestEmailRef} variant="secondary">
          <MailPlus aria-hidden="true" size={17} /> Add test email
        </Button>
      </header>

      <div aria-atomic="true" aria-live="polite" className="email-desk__notice" role="status">
        <Sparkles aria-hidden="true" size={18} />
        <span>
          <strong>{notice}</strong>
          <small>Dummy account · local test data · no delivery provider connected</small>
        </span>
      </div>

      <div
        className={mobileDetailOpen ? 'email-desk__layout is-detail-open' : 'email-desk__layout'}
      >
        <aside aria-label="Test inbox" className="email-desk__inbox">
          <div className="email-desk__inbox-title">
            <span>
              <Inbox aria-hidden="true" size={18} /> Inbox
            </span>
            <StatusBadge tone={needsReviewCount ? 'warning' : 'success'}>
              {needsReviewCount} need review
            </StatusBadge>
          </div>
          <div className="email-desk__threads">
            {desk.emails.map((email) => {
              const reviewed = desk.reviewedIds.includes(email.id);
              return (
                <Button
                  aria-current={selectedEmail?.id === email.id ? 'true' : undefined}
                  className="email-desk__thread"
                  key={email.id}
                  onClick={() => selectEmail(email)}
                  variant="quiet"
                >
                  <span className="email-desk__thread-heading">
                    <strong>{email.fromName}</strong>
                    <time dateTime={email.receivedAt}>{receivedLabel(email.receivedAt)}</time>
                  </span>
                  <span>{email.subject}</span>
                  <small>{email.body}</small>
                  <span
                    className={
                      reviewed ? 'email-desk__review-state is-reviewed' : 'email-desk__review-state'
                    }
                  >
                    {reviewed ? 'Reviewed' : 'Reply ready · review required'}
                  </span>
                </Button>
              );
            })}
          </div>
        </aside>

        {selectedEmail && selectedDraft ? (
          <article
            className="email-desk__detail"
            aria-label={`Email from ${selectedEmail.fromName}`}
          >
            <Button
              className="email-desk__mobile-back"
              onClick={() => setMobileDetailOpen(false)}
              variant="quiet"
            >
              <ArrowLeft aria-hidden="true" size={17} /> Back to inbox
            </Button>
            <section className="email-desk__message">
              <div className="email-desk__message-heading">
                <div>
                  <StatusBadge>Test email</StatusBadge>
                  <h3>{selectedEmail.subject}</h3>
                </div>
                <time dateTime={selectedEmail.receivedAt}>
                  {receivedLabel(selectedEmail.receivedAt)}
                </time>
              </div>
              <p className="email-desk__sender">
                <strong>{selectedEmail.fromName}</strong> &lt;{selectedEmail.fromEmail}&gt;
              </p>
              <p className="email-desk__body">{selectedEmail.body}</p>
            </section>

            <details className="email-desk__context" open>
              <summary>
                <span>
                  <ShieldCheck aria-hidden="true" size={18} />
                  <strong>Client context used</strong>
                </span>
                <ChevronDown aria-hidden="true" size={18} />
              </summary>
              <dl>
                <div>
                  <dt>Client and stage</dt>
                  <dd>
                    {context.businessName} · {context.stage}
                  </dd>
                </div>
                <div>
                  <dt>Matched contact</dt>
                  <dd>{context.contact}</dd>
                </div>
                <div>
                  <dt>Website</dt>
                  <dd>{context.website}</dd>
                </div>
                <div>
                  <dt>Research</dt>
                  <dd>{context.researchSummary}</dd>
                </div>
                <div>
                  <dt>Work state</dt>
                  <dd>{context.openTaskSummary}</dd>
                </div>
                <div>
                  <dt>Email safeguard</dt>
                  <dd>{context.outreachState}</dd>
                </div>
              </dl>
              <p>{context.uncertainty}</p>
            </details>

            <section className="email-desk__draft" aria-labelledby="email-draft-title">
              <div className="email-desk__draft-title">
                <div>
                  <Bot aria-hidden="true" size={19} />
                  <span>
                    <strong id="email-draft-title">Suggested reply</strong>
                    <small>Draft v{draftVersion} · review required</small>
                  </span>
                </div>
                <StatusBadge tone={isReviewed ? 'success' : 'warning'}>
                  {isReviewed ? 'Reviewed' : 'Needs review'}
                </StatusBadge>
              </div>
              <label>
                <span>Subject</span>
                <input
                  value={selectedDraft.subject}
                  onChange={(event) => updateDraft({ subject: event.target.value })}
                />
              </label>
              <label>
                <span>Reply body</span>
                <textarea
                  rows={10}
                  value={selectedDraft.body}
                  onChange={(event) => updateDraft({ body: event.target.value })}
                />
              </label>
              <div className="email-desk__quick-edits" aria-label="Quick AI edits">
                <Button
                  onClick={() => reviseDraft('Make it warmer')}
                  size="small"
                  variant="secondary"
                >
                  Warmer
                </Button>
                <Button
                  onClick={() => reviseDraft('Make it shorter')}
                  size="small"
                  variant="secondary"
                >
                  Shorter
                </Button>
                <Button
                  onClick={() => reviseDraft('Clarify the next step with a call')}
                  size="small"
                  variant="secondary"
                >
                  Clear next step
                </Button>
                <Button
                  onClick={() => reviseDraft('Make it softer with no pressure')}
                  size="small"
                  variant="secondary"
                >
                  No pressure
                </Button>
              </div>
              <form
                className="email-desk__prompt"
                onSubmit={(event) => {
                  event.preventDefault();
                  reviseDraft();
                }}
              >
                <label>
                  <span>Ask AI to edit this draft</span>
                  <input
                    onChange={(event) => setRevisionInstruction(event.target.value)}
                    placeholder="For example: make it concise and suggest a short call"
                    value={revisionInstruction}
                  />
                </label>
                <Button disabled={!revisionInstruction.trim()} type="submit">
                  <Sparkles aria-hidden="true" size={17} /> Revise draft
                </Button>
              </form>
              <ButtonGroup className="email-desk__actions">
                <Button disabled={!previousDraft} onClick={undoRevision} variant="quiet">
                  <RotateCcw aria-hidden="true" size={17} /> Undo AI edit
                </Button>
                <Button
                  onClick={() => setNotice('Draft saved locally. It has not been sent.')}
                  variant="secondary"
                >
                  <Save aria-hidden="true" size={17} /> Save draft
                </Button>
                <Button disabled={isReviewed} onClick={markReviewed}>
                  <CheckCircle2 aria-hidden="true" size={17} />{' '}
                  {isReviewed ? 'Reviewed' : 'Mark reviewed'}
                </Button>
                <Button
                  disabled
                  title="A delivery provider is not connected in test mode"
                  variant="secondary"
                >
                  <Send aria-hidden="true" size={17} /> Send unavailable in test mode
                </Button>
              </ButtonGroup>
            </section>
          </article>
        ) : null}
      </div>

      <Dialog.Root onOpenChange={setTestDialogOpen} open={testDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="confirmation-overlay" />
          <Dialog.Content
            className="email-test-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              addTestEmailRef.current?.focus();
            }}
          >
            <div className="email-test-dialog__header">
              <div>
                <Eyebrow>Dummy account</Eyebrow>
                <Dialog.Title>Deliver a test email</Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <IconButton label="Close test email" variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description>
              This creates a local inbound message and a contextual reply. It does not contact
              anyone.
            </Dialog.Description>
            <form onSubmit={addTestEmail}>
              <div className="email-test-dialog__fields">
                <label>
                  <span>From name</span>
                  <input
                    required
                    value={testFromName}
                    onChange={(event) => setTestFromName(event.target.value)}
                  />
                </label>
                <label>
                  <span>From email</span>
                  <input
                    required
                    type="email"
                    value={testFromEmail}
                    onChange={(event) => setTestFromEmail(event.target.value)}
                  />
                </label>
                <label className="email-test-dialog__wide">
                  <span>Subject</span>
                  <input
                    required
                    value={testSubject}
                    onChange={(event) => setTestSubject(event.target.value)}
                  />
                </label>
                <label className="email-test-dialog__wide">
                  <span>Message</span>
                  <textarea
                    required
                    rows={6}
                    value={testBody}
                    onChange={(event) => setTestBody(event.target.value)}
                  />
                </label>
              </div>
              <ButtonGroup className="email-test-dialog__actions">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button type="submit">
                  <MailPlus aria-hidden="true" size={17} /> Deliver to test inbox
                </Button>
              </ButtonGroup>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
