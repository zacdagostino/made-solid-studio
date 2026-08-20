import { useMemo, useState, type FormEvent } from 'react';
import { Ban, CheckCircle2, MailCheck, PhoneCall, ShieldCheck } from 'lucide-react';
import type { OutreachComplianceInput, ProspectWorkspace } from '../lib/domain';
import { Button } from './ui';

export function OutreachReadinessPanel({
  workspace,
  onApprove,
}: {
  workspace: ProspectWorkspace;
  onApprove: (input: OutreachComplianceInput) => Promise<void>;
}) {
  const existing = workspace.outreachCompliance;
  const emailContact = workspace.contacts.find((contact) => contact.email);
  const phoneContact = workspace.contacts.find((contact) => contact.phone);
  const [basis, setBasis] = useState<OutreachComplianceInput['consentBasis']>(
    existing?.consentBasis ?? 'not_established',
  );
  const [sourceUrl, setSourceUrl] = useState(existing?.sourceUrl ?? workspace.website?.url ?? '');
  const [sourceNote, setSourceNote] = useState(existing?.sourceNote ?? '');
  const [emailAllowed, setEmailAllowed] = useState(existing?.emailAllowed ?? false);
  const [phoneAllowed, setPhoneAllowed] = useState(existing?.phoneAllowed ?? false);
  const [doNotCallClear, setDoNotCallClear] = useState(existing?.doNotCallClear ?? false);
  const [senderConfirmed, setSenderConfirmed] = useState(
    existing?.senderIdentificationConfirmed ?? false,
  );
  const [unsubscribeConfirmed, setUnsubscribeConfirmed] = useState(
    existing?.unsubscribeProcessConfirmed ?? false,
  );
  const [suppressed, setSuppressed] = useState(Boolean(existing?.suppressedAt));
  const [suppressionReason, setSuppressionReason] = useState(existing?.suppressionReason ?? '');
  const [campaignCohort, setCampaignCohort] = useState(
    existing?.campaignCohort ?? 'cold-preview-pilot',
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const emailReady =
    emailAllowed && Boolean(emailContact) && senderConfirmed && unsubscribeConfirmed;
  const phoneReady = phoneAllowed && Boolean(phoneContact) && doNotCallClear;
  const ready = useMemo(
    () =>
      basis !== 'not_established' &&
      !suppressed &&
      Boolean(sourceNote.trim()) &&
      (basis !== 'public_role_relevant' || Boolean(sourceUrl.trim())) &&
      (emailReady || phoneReady),
    [basis, emailReady, phoneReady, sourceNote, sourceUrl, suppressed],
  );
  const suppressionReady = suppressed && Boolean(suppressionReason.trim());
  const submittable = ready || suppressionReady;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submittable || busy) return;
    setBusy(true);
    setError('');
    try {
      await onApprove({
        contactId: (emailAllowed ? emailContact : phoneContact)?.id,
        consentBasis: basis,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceNote: sourceNote.trim(),
        emailAllowed,
        phoneAllowed,
        doNotCallCheckedAt: phoneAllowed && doNotCallClear ? new Date().toISOString() : undefined,
        doNotCallClear,
        senderIdentificationConfirmed: senderConfirmed,
        unsubscribeProcessConfirmed: unsubscribeConfirmed,
        suppressedAt: suppressed ? (existing?.suppressedAt ?? new Date().toISOString()) : undefined,
        suppressionReason: suppressed ? suppressionReason.trim() || 'Do not contact' : undefined,
        campaignCohort: campaignCohort.trim() || undefined,
        notes: notes.trim(),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Outreach readiness could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="outreach-readiness">
      <summary>
        <span>
          <ShieldCheck aria-hidden="true" size={18} />
          <span>
            <strong>Review outreach readiness</strong>
            <small>Required before any human-controlled email or call</small>
          </span>
        </span>
      </summary>
      <form className="outreach-readiness__form" onSubmit={submit}>
        <div className="outreach-readiness__notice">
          <ShieldCheck aria-hidden="true" size={18} />
          <p>
            Approval does not send anything. Record why this contact is relevant, identify Made
            Solid in every message, offer a working unsubscribe, and honour suppression immediately.
          </p>
        </div>
        <label>
          <span>Contact basis</span>
          <select value={basis} onChange={(event) => setBasis(event.target.value as typeof basis)}>
            <option value="not_established">Not established — block outreach</option>
            <option value="public_role_relevant">Public business contact relevant to role</option>
            <option value="express_call">Express permission recorded by call or reply</option>
            <option value="existing_relationship">Existing business relationship</option>
          </select>
        </label>
        <label>
          <span>Evidence URL</span>
          <input
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="Public page where the business contact was published"
            type="url"
            value={sourceUrl}
          />
        </label>
        <label className="outreach-readiness__wide">
          <span>Why the message is relevant</span>
          <textarea
            maxLength={2000}
            onChange={(event) => setSourceNote(event.target.value)}
            placeholder="Role, observed website need and the narrow reason for contact"
            rows={3}
            value={sourceNote}
          />
        </label>
        <fieldset>
          <legend>Permitted channels</legend>
          <label className="outreach-readiness__check">
            <input
              checked={emailAllowed}
              disabled={!emailContact}
              onChange={(event) => setEmailAllowed(event.target.checked)}
              type="checkbox"
            />
            <MailCheck aria-hidden="true" size={17} /> Email
            {!emailContact ? <small>No captured email address</small> : null}
          </label>
          <label className="outreach-readiness__check">
            <input
              checked={phoneAllowed}
              disabled={!phoneContact}
              onChange={(event) => setPhoneAllowed(event.target.checked)}
              type="checkbox"
            />
            <PhoneCall aria-hidden="true" size={17} /> Phone
            {!phoneContact ? <small>No captured phone number</small> : null}
          </label>
        </fieldset>
        {emailAllowed ? (
          <fieldset>
            <legend>Email safeguards</legend>
            <label className="outreach-readiness__check">
              <input
                checked={senderConfirmed}
                onChange={(event) => setSenderConfirmed(event.target.checked)}
                type="checkbox"
              />
              Sender identity and contact details will be included
            </label>
            <label className="outreach-readiness__check">
              <input
                checked={unsubscribeConfirmed}
                onChange={(event) => setUnsubscribeConfirmed(event.target.checked)}
                type="checkbox"
              />
              Working unsubscribe will be included and honoured
            </label>
          </fieldset>
        ) : null}
        {phoneAllowed ? (
          <fieldset>
            <legend>Phone safeguard</legend>
            <label className="outreach-readiness__check">
              <input
                checked={doNotCallClear}
                onChange={(event) => setDoNotCallClear(event.target.checked)}
                type="checkbox"
              />
              Do Not Call Register check completed and clear today
            </label>
          </fieldset>
        ) : null}
        <label>
          <span>Pilot cohort</span>
          <input
            maxLength={120}
            onChange={(event) => setCampaignCohort(event.target.value)}
            value={campaignCohort}
          />
        </label>
        <label>
          <span>Internal notes</span>
          <input
            maxLength={4000}
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </label>
        <label className="outreach-readiness__check outreach-readiness__wide outreach-readiness__suppress">
          <input
            checked={suppressed}
            onChange={(event) => setSuppressed(event.target.checked)}
            type="checkbox"
          />
          <Ban aria-hidden="true" size={17} /> Suppress this prospect from all outreach
        </label>
        {suppressed ? (
          <label className="outreach-readiness__wide">
            <span>Suppression reason</span>
            <input
              onChange={(event) => setSuppressionReason(event.target.value)}
              value={suppressionReason}
            />
          </label>
        ) : null}
        {error ? (
          <p className="form-message form-message--error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="outreach-readiness__actions">
          <p>
            {suppressed
              ? suppressionReady
                ? 'Suppression will be saved without approving outreach.'
                : 'Record why this prospect must not be contacted.'
              : ready
                ? 'All selected-channel safeguards are recorded.'
                : 'Add a relevance note and complete one available, compliant channel.'}
          </p>
          <Button disabled={!submittable || busy} type="submit">
            <CheckCircle2 aria-hidden="true" size={17} />
            {busy
              ? 'Saving review…'
              : suppressed
                ? 'Save suppression'
                : 'Save and approve for outreach'}
          </Button>
        </div>
      </form>
    </details>
  );
}
