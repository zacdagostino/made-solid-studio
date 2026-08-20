import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import type { BuildManifest } from '../lib/domain';
import {
  approvePricingCalculation,
  calculateBuildPricing,
  defaultPricingOptions,
  formatAud,
  type PricingOptions,
  type PricingQuoteSnapshot,
  type PricingSourceScope,
} from '../lib/pricing';
import { Button, ButtonGroup, StatusBadge } from './ui';

function quoteReference() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `quote-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

export function PricingCalculator({
  manifest,
  sourceScope,
  onApprovedQuoteChange,
}: {
  manifest?: BuildManifest;
  sourceScope?: PricingSourceScope;
  onApprovedQuoteChange: (quote?: PricingQuoteSnapshot) => void;
}) {
  const configuredDefaults = useMemo(
    () => ({
      ...defaultPricingOptions,
      applyGst: import.meta.env.VITE_MADE_SOLID_GST_REGISTERED === 'true',
    }),
    [],
  );
  const [options, setOptions] = useState<PricingOptions>(configuredDefaults);
  const [approved, setApproved] = useState<PricingQuoteSnapshot>();
  const sourceScopeKey = JSON.stringify(sourceScope ?? null);
  const calculation = useMemo(
    () => (manifest ? calculateBuildPricing(manifest, options, sourceScope) : undefined),
    // The scope key prevents the 10-second source refresh from invalidating an unchanged quote.
    [manifest, options, sourceScopeKey],
  );

  useEffect(() => {
    setApproved(undefined);
    onApprovedQuoteChange(undefined);
  }, [calculation, onApprovedQuoteChange]);

  if (!manifest || !calculation) {
    return (
      <section className="pricing-calculator pricing-calculator--empty">
        <ShieldAlert aria-hidden="true" size={20} />
        <div>
          <strong>Build pricing is waiting for an approved manifest</strong>
          <p>Prepare the immutable Build Manifest before calculating a client investment.</p>
        </div>
      </section>
    );
  }
  const currentCalculation = calculation;

  function updateOption<Key extends keyof PricingOptions>(key: Key, value: PricingOptions[Key]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  function approve() {
    if (currentCalculation.reviewRequired) return;
    const snapshot = approvePricingCalculation(currentCalculation, quoteReference());
    setApproved(snapshot);
    onApprovedQuoteChange(snapshot);
  }

  return (
    <section className="pricing-calculator" data-testid="pricing-calculator">
      <div className="pricing-calculator__header">
        <div>
          <span className="pricing-calculator__icon" aria-hidden="true">
            <CircleDollarSign size={20} />
          </span>
          <div>
            <span className="pricing-calculator__eyebrow">Recommended prospect offer</span>
            <h3>{formatAud(calculation.totalCents)}</h3>
          </div>
        </div>
        <StatusBadge
          tone={approved ? 'success' : calculation.reviewRequired ? 'warning' : 'neutral'}
        >
          {approved ? 'Approved' : calculation.reviewRequired ? 'Scope review' : 'Draft quote'}
        </StatusBadge>
      </div>

      <div className="pricing-calculator__metrics" aria-label="Build pricing signals">
        <span>
          <strong>{calculation.metrics.corePages}</strong>
          <small>Core pages</small>
        </span>
        <span>
          <strong>{calculation.metrics.contentEntries}</strong>
          <small>Content entries</small>
        </span>
        <span>
          <strong>{calculation.metrics.redirectRoutes}</strong>
          <small>Unbilled redirects</small>
        </span>
        <span>
          <strong>{calculation.metrics.uniquePageTypes}</strong>
          <small>Page systems</small>
        </span>
      </div>

      <p className="pricing-calculator__source" role="status">
        <strong>{calculation.sourceScope.revisionLabel}</strong>
        <span>
          {calculation.sourceScope.source === 'working_source'
            ? 'Pricing follows the newest uncommitted source. Finalising the edit will lock this exact scope to the quote.'
            : 'Pricing is locked to the newest available source scope.'}
        </span>
      </p>

      <div className="pricing-calculator__guardrail">
        <span>
          <small>Internal full-scope value</small>
          <strong>{formatAud(calculation.fullScopeValueCents)}</strong>
        </span>
        <span>
          <small>Automatic cold-offer ceiling</small>
          <strong>{formatAud(calculation.automaticOfferCeilingCents)}</strong>
        </span>
        <p>
          The client sees clear fixed choices. Company size or net worth never changes the price;
          only the latest reviewed build scope does.
        </p>
      </div>

      <div className="pricing-calculator__offers" aria-label="Client offer choices">
        <div className="pricing-calculator__section-heading">
          <span aria-hidden="true">
            <WalletCards size={18} />
          </span>
          <div>
            <strong>Client choice menu</strong>
            <small>Every amount is a complete commitment, not a teaser price.</small>
          </div>
        </div>
        <div className="pricing-calculator__offer-grid">
          {calculation.offerChoices.map((offer) => (
            <article
              className={
                offer.recommended
                  ? 'pricing-calculator__offer pricing-calculator__offer--recommended'
                  : 'pricing-calculator__offer'
              }
              key={offer.id}
            >
              <div>
                <span>
                  {offer.recommended
                    ? 'Recommended'
                    : offer.kind === 'managed'
                      ? 'Lower upfront'
                      : 'Alternative'}
                </span>
                <strong>{offer.label}</strong>
              </div>
              <p>{offer.summary}</p>
              <strong className="pricing-calculator__offer-price">
                {offer.kind === 'managed'
                  ? `${formatAud(offer.setupCents)} + ${formatAud(offer.recurringCents)}/mo`
                  : formatAud(offer.totalCommitmentCents)}
              </strong>
              {offer.kind === 'managed' ? (
                <small>
                  {offer.recurringMonths} months · {formatAud(offer.totalCommitmentCents)} total
                  commitment
                </small>
              ) : (
                <small>
                  {offer.paymentSchedule.length}{' '}
                  {offer.paymentSchedule.length === 1 ? 'payment' : 'fixed payments'} ·{' '}
                  {offer.scopeLabel}
                </small>
              )}
            </article>
          ))}
        </div>
      </div>

      <details className="pricing-calculator__scope" open>
        <summary>
          <span>
            <strong>Build-derived scope</strong>
            <small>{calculation.lineItems.length} priced components · internal review only</small>
          </span>
        </summary>
        <div className="pricing-calculator__lines">
          {calculation.lineItems.map((item) => (
            <div key={item.id}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <strong>{formatAud(item.amountCents)}</strong>
            </div>
          ))}
        </div>
      </details>

      <div className="pricing-calculator__controls">
        <label>
          <span>Content preparation</span>
          <select
            onChange={(event) =>
              updateOption('contentMode', event.target.value as PricingOptions['contentMode'])
            }
            value={options.contentMode}
          >
            <option value="client_ready">Client supplies launch-ready copy</option>
            <option value="refine">Made Solid refines supplied content</option>
            <option value="write">Made Solid writes new website copy</option>
          </select>
        </label>
        <label>
          <span>Motion treatment</span>
          <select
            onChange={(event) =>
              updateOption('motionTier', event.target.value as PricingOptions['motionTier'])
            }
            value={options.motionTier}
          >
            <option value="standard">Standard interaction polish</option>
            <option value="advanced">Advanced motion system</option>
            <option value="signature">Signature motion direction</option>
          </select>
        </label>
        <label>
          <span>Reviewed adjustment (AUD)</span>
          <input
            inputMode="decimal"
            onChange={(event) =>
              updateOption('adjustmentCents', Math.round((Number(event.target.value) || 0) * 100))
            }
            step="100"
            type="number"
            value={options.adjustmentCents / 100 || ''}
          />
        </label>
        <label className="pricing-calculator__wide">
          <span>Adjustment reason</span>
          <input
            maxLength={500}
            onChange={(event) => updateOption('adjustmentReason', event.target.value)}
            placeholder="Required for any manual adjustment"
            type="text"
            value={options.adjustmentReason}
          />
        </label>
        <label className="pricing-calculator__check">
          <input
            checked={options.applyGst}
            onChange={(event) => updateOption('applyGst', event.target.checked)}
            type="checkbox"
          />
          <span>Apply 10% GST</span>
        </label>
        <label className="pricing-calculator__check">
          <input
            checked={options.rush}
            onChange={(event) => updateOption('rush', event.target.checked)}
            type="checkbox"
          />
          <span>Reserve priority delivery (+20%)</span>
        </label>
        <label className="pricing-calculator__check">
          <input
            checked={options.includeManaged}
            onChange={(event) => updateOption('includeManaged', event.target.checked)}
            type="checkbox"
          />
          <span>Offer a 24-month managed plan</span>
        </label>
        <label className="pricing-calculator__check">
          <input
            checked={options.includeEssentials}
            onChange={(event) => updateOption('includeEssentials', event.target.checked)}
            type="checkbox"
          />
          <span>Offer a focused essentials launch</span>
        </label>
      </div>

      <dl className="pricing-calculator__totals">
        <div>
          <dt>Recommended subtotal</dt>
          <dd>{formatAud(calculation.subtotalCents)}</dd>
        </div>
        <div>
          <dt>GST</dt>
          <dd>{formatAud(calculation.gstCents)}</dd>
        </div>
        <div className="pricing-calculator__total">
          <dt>Total investment</dt>
          <dd>{formatAud(calculation.totalCents)}</dd>
        </div>
        <div>
          <dt>Opening payment</dt>
          <dd>{formatAud(calculation.depositCents)}</dd>
        </div>
        <div>
          <dt>Release balance</dt>
          <dd>{formatAud(calculation.balanceCents)}</dd>
        </div>
      </dl>

      <div className="pricing-calculator__schedule">
        <strong>
          <Landmark aria-hidden="true" size={17} /> Recommended payment milestones
        </strong>
        <ol>
          {calculation.paymentSchedule.map((milestone) => (
            <li key={milestone.sequence}>
              <span>
                <small>Payment {milestone.sequence}</small>
                <strong>{milestone.label}</strong>
                <small>{milestone.dueTrigger}</small>
              </span>
              <strong>{formatAud(milestone.amountCents)}</strong>
            </li>
          ))}
        </ol>
      </div>

      {calculation.reviewRequired ? (
        <div className="pricing-calculator__review" role="alert">
          <ShieldAlert aria-hidden="true" size={18} />
          <div>
            <strong>Resolve these items before approval</strong>
            <ul>
              {calculation.reviewReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {approved ? (
        <div className="pricing-calculator__approved" role="status">
          <CheckCircle2 aria-hidden="true" size={20} />
          <span>
            <strong>Quote approved for handoff</strong>
            <small>
              Reference {approved.quoteReference.slice(0, 8)} · changing scope will return it to
              draft.
            </small>
          </span>
        </div>
      ) : (
        <ButtonGroup>
          <Button disabled={calculation.reviewRequired} onClick={approve} type="button">
            <Sparkles aria-hidden="true" size={16} /> Approve calculated quote
          </Button>
          <Button onClick={() => setOptions(configuredDefaults)} type="button" variant="secondary">
            <RotateCcw aria-hidden="true" size={16} /> Reset review choices
          </Button>
        </ButtonGroup>
      )}
    </section>
  );
}
