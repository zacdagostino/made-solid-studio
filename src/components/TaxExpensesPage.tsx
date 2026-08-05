import * as Dialog from '@radix-ui/react-dialog';
import { Bot, Cloud, Download, Pencil, Plus, ReceiptText, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type {
  ProspectWorkspace,
  TaxExpense,
  TaxExpenseCategory,
  TaxExpenseInput,
} from '../lib/domain';
import type { WorkspaceRepository } from '../lib/repository';
import { Button, ButtonGroup, ConfirmationDialog, Eyebrow, IconButton } from './ui';

const categories: Array<{ value: TaxExpenseCategory; label: string }> = [
  { value: 'software_subscriptions', label: 'Software & subscriptions' },
  { value: 'hosting_domains', label: 'Hosting & domains' },
  { value: 'professional_services', label: 'Professional services' },
  { value: 'advertising_marketing', label: 'Advertising & marketing' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'office_supplies', label: 'Office supplies' },
  { value: 'travel_transport', label: 'Travel & transport' },
  { value: 'education_training', label: 'Education & training' },
  { value: 'insurance_fees', label: 'Insurance & fees' },
  { value: 'phone_internet', label: 'Phone & internet' },
  { value: 'other', label: 'Other' },
];

type ExpenseDraft = {
  incurredOn: string;
  supplier: string;
  description: string;
  category: TaxExpenseCategory;
  amount: string;
  gst: string;
  deductiblePercent: string;
  paymentMethod: string;
  receiptReference: string;
  notes: string;
};

function perthDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Perth',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function emptyDraft(): ExpenseDraft {
  return {
    incurredOn: perthDate(),
    supplier: '',
    description: '',
    category: 'software_subscriptions',
    amount: '',
    gst: '0.00',
    deductiblePercent: '100',
    paymentMethod: '',
    receiptReference: '',
    notes: '',
  };
}

function draftFromExpense(expense: TaxExpense): ExpenseDraft {
  return {
    incurredOn: expense.incurredOn,
    supplier: expense.supplier,
    description: expense.description,
    category: expense.category,
    amount: (expense.amountCents / 100).toFixed(2),
    gst: (expense.gstCents / 100).toFixed(2),
    deductiblePercent: String(expense.deductiblePercent),
    paymentMethod: expense.paymentMethod,
    receiptReference: expense.receiptReference,
    notes: expense.notes,
  };
}

function financialYearStart(date: string) {
  const [year, month] = date.split('-').map(Number);
  return month >= 7 ? year : year - 1;
}

function financialYearLabel(start: number) {
  return `FY ${start}–${String(start + 1).slice(-2)}`;
}

function categoryLabel(category: TaxExpenseCategory) {
  return categories.find((item) => item.value === category)?.label ?? category;
}

function audFromCents(cents: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100);
}

function expenseDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function centsFromInput(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

function inputFromDraft(draft: ExpenseDraft): TaxExpenseInput | undefined {
  const amountCents = centsFromInput(draft.amount);
  const gstCents = centsFromInput(draft.gst || '0');
  const deductiblePercent = Number(draft.deductiblePercent);
  if (
    !draft.incurredOn ||
    !draft.supplier.trim() ||
    !draft.description.trim() ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0 ||
    !Number.isInteger(gstCents) ||
    gstCents < 0 ||
    gstCents > amountCents ||
    !Number.isInteger(deductiblePercent) ||
    deductiblePercent < 0 ||
    deductiblePercent > 100
  ) {
    return undefined;
  }
  return {
    incurredOn: draft.incurredOn,
    supplier: draft.supplier.trim(),
    description: draft.description.trim(),
    category: draft.category,
    amountCents,
    gstCents,
    deductiblePercent,
    paymentMethod: draft.paymentMethod.trim(),
    receiptReference: draft.receiptReference.trim(),
    notes: draft.notes.trim(),
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadExpenses(expenses: TaxExpense[], yearStart: number) {
  const rows = [
    [
      'Financial year',
      'Date',
      'Supplier',
      'Description',
      'Category',
      'Amount (AUD, incl. GST)',
      'GST included (AUD)',
      'Business use (%)',
      'Potential deductible amount (AUD)',
      'Payment method',
      'Receipt / reference',
      'Notes',
    ],
    ...expenses.map((expense) => [
      financialYearLabel(yearStart),
      expense.incurredOn,
      expense.supplier,
      expense.description,
      categoryLabel(expense.category),
      (expense.amountCents / 100).toFixed(2),
      (expense.gstCents / 100).toFixed(2),
      expense.deductiblePercent,
      ((expense.amountCents * expense.deductiblePercent) / 10_000).toFixed(2),
      expense.paymentMethod,
      expense.receiptReference,
      expense.notes,
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `made-solid-tax-expenses-${yearStart}-${yearStart + 1}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ExpenseForm({
  draft,
  editing,
  error,
  saving,
  onCancel,
  onChange,
  onSubmit,
}: {
  draft: ExpenseDraft;
  editing: boolean;
  error: string;
  saving: boolean;
  onCancel: () => void;
  onChange: (patch: Partial<ExpenseDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="tax-expense-form" onSubmit={onSubmit}>
      <label>
        Date
        <input
          onChange={(event) => onChange({ incurredOn: event.target.value })}
          required
          type="date"
          value={draft.incurredOn}
        />
      </label>
      <label>
        Supplier
        <input
          autoComplete="organization"
          maxLength={160}
          onChange={(event) => onChange({ supplier: event.target.value })}
          placeholder="e.g. Supabase"
          required
          value={draft.supplier}
        />
      </label>
      <label className="tax-expense-form__wide">
        What was it for?
        <input
          maxLength={400}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="e.g. Pro hosting plan – August"
          required
          value={draft.description}
        />
      </label>
      <label>
        Category
        <select
          onChange={(event) => onChange({ category: event.target.value as TaxExpenseCategory })}
          value={draft.category}
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Total amount (AUD)
        <input
          inputMode="decimal"
          min="0.01"
          onChange={(event) => onChange({ amount: event.target.value })}
          placeholder="0.00"
          required
          step="0.01"
          type="number"
          value={draft.amount}
        />
      </label>
      <label>
        GST included (AUD)
        <input
          inputMode="decimal"
          min="0"
          onChange={(event) => onChange({ gst: event.target.value })}
          step="0.01"
          type="number"
          value={draft.gst}
        />
      </label>
      <label>
        Business use (%)
        <input
          inputMode="numeric"
          max="100"
          min="0"
          onChange={(event) => onChange({ deductiblePercent: event.target.value })}
          required
          step="1"
          type="number"
          value={draft.deductiblePercent}
        />
      </label>
      <label>
        Payment method
        <input
          maxLength={80}
          onChange={(event) => onChange({ paymentMethod: event.target.value })}
          placeholder="e.g. Business card"
          value={draft.paymentMethod}
        />
      </label>
      <label>
        Receipt or invoice reference
        <input
          maxLength={240}
          onChange={(event) => onChange({ receiptReference: event.target.value })}
          placeholder="Invoice number or file name"
          value={draft.receiptReference}
        />
      </label>
      <label className="tax-expense-form__wide">
        Notes
        <textarea
          maxLength={2000}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Optional context for your accountant"
          rows={3}
          value={draft.notes}
        />
      </label>
      {error ? (
        <p className="tax-expense-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <ButtonGroup className="tax-expense-form__actions">
        <Button disabled={saving} type="submit">
          {editing ? null : <Plus aria-hidden="true" size={17} />}
          {saving ? 'Saving expense' : editing ? 'Save changes' : 'Add expense'}
        </Button>
        {editing ? (
          <Button disabled={saving} onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        ) : null}
      </ButtonGroup>
    </form>
  );
}

export function TaxExpensesPage({
  repository,
  workspaces,
}: {
  repository: WorkspaceRepository;
  workspaces: ProspectWorkspace[];
}) {
  const [expenses, setExpenses] = useState<TaxExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<ExpenseDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaxExpense>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const addTriggerRef = useRef<HTMLButtonElement | null>(null);
  const panelReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  const currentYearStart = financialYearStart(perthDate());
  const [selectedYearStart, setSelectedYearStart] = useState(currentYearStart);
  const [categoryFilter, setCategoryFilter] = useState<'all' | TaxExpenseCategory>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    void repository
      .listTaxExpenses()
      .then((records) => {
        if (active) setExpenses(records);
      })
      .catch(() => {
        if (active)
          setLoadError('Tax expenses could not be loaded. Check your connection and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository]);

  const yearOptions = useMemo(
    () =>
      [
        ...new Set([
          currentYearStart + 1,
          currentYearStart,
          currentYearStart - 1,
          ...expenses.map((expense) => financialYearStart(expense.incurredOn)),
        ]),
      ].sort((left, right) => right - left),
    [currentYearStart, expenses],
  );
  const yearExpenses = expenses.filter(
    (expense) => financialYearStart(expense.incurredOn) === selectedYearStart,
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleExpenses = yearExpenses.filter((expense) => {
    if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
    if (!normalizedSearch) return true;
    return [
      expense.supplier,
      expense.description,
      expense.receiptReference,
      expense.notes,
      categoryLabel(expense.category),
    ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  });
  const totalCents = yearExpenses.reduce((total, expense) => total + expense.amountCents, 0);
  const gstCents = yearExpenses.reduce((total, expense) => total + expense.gstCents, 0);
  const potentialDeductionCents = Math.round(
    yearExpenses.reduce(
      (total, expense) => total + expense.amountCents * (expense.deductiblePercent / 100),
      0,
    ),
  );
  const trackedAiRecords = workspaces
    .flatMap((workspace) => workspace.aiUsageRecords)
    .filter(
      (record) =>
        record.costUsd !== undefined &&
        financialYearStart(record.createdAt.slice(0, 10)) === selectedYearStart,
    );
  const trackedAiCostUsd = trackedAiRecords.reduce(
    (total, record) => total + (record.costUsd ?? 0),
    0,
  );

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = inputFromDraft(draft);
    if (!input) {
      setFormError(
        'Complete the required fields. GST cannot exceed the total, and business use must be from 0 to 100%.',
      );
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const saved = editingId
        ? await repository.updateTaxExpense(editingId, input)
        : await repository.createTaxExpense(input);
      setExpenses((current) =>
        [saved, ...current.filter((expense) => expense.id !== saved.id)].sort(
          (left, right) =>
            right.incurredOn.localeCompare(left.incurredOn) ||
            right.createdAt.localeCompare(left.createdAt),
        ),
      );
      setSelectedYearStart(financialYearStart(saved.incurredOn));
      setEditingId(undefined);
      setDraft(emptyDraft());
      setPanelOpen(false);
    } catch {
      setFormError('The expense could not be saved. Your values are still here—please try again.');
    } finally {
      setSaving(false);
    }
  }

  function openExpensePanel(nextDraft: ExpenseDraft, trigger: HTMLButtonElement | null) {
    panelReturnFocusRef.current = trigger ?? addTriggerRef.current;
    setEditingId(undefined);
    setDraft(nextDraft);
    setFormError('');
    setPanelOpen(true);
  }

  function editExpense(expense: TaxExpense, trigger: HTMLButtonElement) {
    panelReturnFocusRef.current = trigger;
    setEditingId(expense.id);
    setDraft(draftFromExpense(expense));
    setFormError('');
    setPanelOpen(true);
  }

  function cancelEditing() {
    setEditingId(undefined);
    setDraft(emptyDraft());
    setFormError('');
    setPanelOpen(false);
  }

  function suggestedDraft(kind: 'openai' | 'supabase'): ExpenseDraft {
    if (kind === 'openai') {
      return {
        ...emptyDraft(),
        supplier: 'OpenAI',
        description: 'Codex and OpenAI usage charges',
        notes: trackedAiRecords.length
          ? `Studio tracked US$${trackedAiCostUsd.toFixed(2)} across ${trackedAiRecords.length} priced AI operation${trackedAiRecords.length === 1 ? '' : 's'} in ${financialYearLabel(selectedYearStart)}. Enter and verify the actual AUD invoice or card charge.`
          : 'Enter and verify the actual AUD amount from your OpenAI invoice or card statement.',
      };
    }
    return {
      ...emptyDraft(),
      supplier: 'Supabase',
      description: 'Supabase Pro subscription',
      category: 'hosting_domains',
      notes: 'Enter and verify the actual AUD amount from your Supabase invoice or card statement.',
    };
  }

  async function deleteExpense() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await repository.deleteTaxExpense(deleteTarget.id);
      setExpenses((current) => current.filter((expense) => expense.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) cancelEditing();
      setDeleteTarget(undefined);
    } catch {
      setDeleteError('The expense could not be deleted. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-labelledby="tax-page-title" className="tax-page">
      <header className="tax-page__header">
        <div>
          <Eyebrow>Business records</Eyebrow>
          <h1 id="tax-page-title">Tax expenses</h1>
          <p>
            Keep an accountant-ready record of business spending for Australian financial years.
            Amounts are planning records, not tax advice.
          </p>
        </div>
        <ButtonGroup className="tax-page__actions">
          <Button
            onClick={(event) => openExpensePanel(emptyDraft(), event.currentTarget)}
            ref={addTriggerRef}
          >
            <Plus aria-hidden="true" size={17} /> Add expense
          </Button>
          <Button
            aria-describedby={!yearExpenses.length ? 'tax-download-help' : undefined}
            disabled={!yearExpenses.length}
            onClick={() => downloadExpenses(yearExpenses, selectedYearStart)}
            variant="secondary"
          >
            <Download aria-hidden="true" size={17} /> Download CSV
          </Button>
        </ButtonGroup>
      </header>
      <p className="sr-only" id="tax-download-help">
        Add an expense in the selected financial year to enable the CSV download.
      </p>

      <section aria-label="Tax expense filters" className="tax-toolbar">
        <label>
          Financial year
          <select
            onChange={(event) => setSelectedYearStart(Number(event.target.value))}
            value={selectedYearStart}
          >
            {yearOptions.map((yearStart) => (
              <option key={yearStart} value={yearStart}>
                {financialYearLabel(yearStart)} · 1 Jul {yearStart}–30 Jun {yearStart + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            onChange={(event) =>
              setCategoryFilter(event.target.value as 'all' | TaxExpenseCategory)
            }
            value={categoryFilter}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search records
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Supplier, description or receipt"
            type="search"
            value={search}
          />
        </label>
      </section>

      <section
        aria-label={`${financialYearLabel(selectedYearStart)} summary`}
        className="tax-summary"
      >
        <article>
          <span>Total spending</span>
          <strong>{audFromCents(totalCents)}</strong>
          <small>
            {yearExpenses.length} recorded expense{yearExpenses.length === 1 ? '' : 's'}
          </small>
        </article>
        <article>
          <span>GST recorded</span>
          <strong>{audFromCents(gstCents)}</strong>
          <small>Before business-use adjustments</small>
        </article>
        <article>
          <span>Potential deduction</span>
          <strong>{audFromCents(potentialDeductionCents)}</strong>
          <small>Based on each business-use percentage</small>
        </article>
      </section>

      <section aria-labelledby="tax-spend-inbox-title" className="tax-spend-inbox">
        <div className="tax-spend-inbox__heading">
          <div>
            <Eyebrow>Spend inbox</Eyebrow>
            <h2 id="tax-spend-inbox-title">Costs that may need recording</h2>
          </div>
          <p>
            Review the real invoice or card statement before adding these. Studio does not convert
            USD estimates into AUD tax records automatically.
          </p>
        </div>
        <div className="tax-spend-inbox__items">
          <article className="tax-spend-suggestion">
            <Bot aria-hidden="true" size={20} />
            <div>
              <strong>Codex &amp; OpenAI</strong>
              <span>
                {trackedAiRecords.length
                  ? `US$${trackedAiCostUsd.toFixed(2)} tracked across ${trackedAiRecords.length} priced operation${trackedAiRecords.length === 1 ? '' : 's'}`
                  : 'No priced AI operations are tracked for this financial year'}
              </span>
            </div>
            <Button
              onClick={(event) => openExpensePanel(suggestedDraft('openai'), event.currentTarget)}
              size="small"
              variant="secondary"
            >
              Record OpenAI charge
            </Button>
          </article>
          <article className="tax-spend-suggestion">
            <Cloud aria-hidden="true" size={20} />
            <div>
              <strong>Supabase Pro</strong>
              <span>Subscription billing is external to Studio</span>
            </div>
            <Button
              onClick={(event) => openExpensePanel(suggestedDraft('supabase'), event.currentTarget)}
              size="small"
              variant="secondary"
            >
              Record subscription
            </Button>
          </article>
        </div>
      </section>

      <section aria-labelledby="tax-ledger-title" className="tax-ledger">
        <div className="tax-ledger__heading">
          <div>
            <Eyebrow>{financialYearLabel(selectedYearStart)}</Eyebrow>
            <h2 id="tax-ledger-title">Expense ledger</h2>
          </div>
          <span aria-live="polite">
            Showing {visibleExpenses.length} of {yearExpenses.length}
          </span>
        </div>
        {loading ? (
          <div className="tax-ledger__state" role="status">
            Loading tax expenses…
          </div>
        ) : loadError ? (
          <div className="tax-ledger__state tax-ledger__state--error" role="alert">
            {loadError}
          </div>
        ) : visibleExpenses.length ? (
          <div className="tax-expense-list">
            {visibleExpenses.map((expense) => (
              <article className="tax-expense-row" key={expense.id}>
                <div className="tax-expense-row__date">
                  <ReceiptText aria-hidden="true" size={18} />
                  <time dateTime={expense.incurredOn}>{expenseDate(expense.incurredOn)}</time>
                </div>
                <div className="tax-expense-row__identity">
                  <strong>{expense.supplier}</strong>
                  <span>{expense.description}</span>
                  <small>
                    {categoryLabel(expense.category)}
                    {expense.receiptReference ? ` · ${expense.receiptReference}` : ''}
                  </small>
                </div>
                <div className="tax-expense-row__amount">
                  <strong>{audFromCents(expense.amountCents)}</strong>
                  <small>
                    {expense.deductiblePercent}% business use
                    {expense.gstCents ? ` · ${audFromCents(expense.gstCents)} GST` : ''}
                  </small>
                </div>
                <ButtonGroup className="tax-expense-row__actions">
                  <IconButton
                    label={`Edit ${expense.description} from ${expense.supplier}`}
                    onClick={(event) => editExpense(expense, event.currentTarget)}
                    variant="quiet"
                  >
                    <Pencil aria-hidden="true" size={17} />
                  </IconButton>
                  <IconButton
                    label={`Delete ${expense.description} from ${expense.supplier}`}
                    onClick={(event) => {
                      deleteTriggerRef.current = event.currentTarget;
                      setDeleteError('');
                      setDeleteTarget(expense);
                    }}
                    variant="quiet"
                  >
                    <Trash2 aria-hidden="true" size={17} />
                  </IconButton>
                </ButtonGroup>
                {expense.notes ? <p className="tax-expense-row__notes">{expense.notes}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="tax-ledger__state">
            <ReceiptText aria-hidden="true" size={22} />
            <div>
              <strong>
                {yearExpenses.length
                  ? 'No expenses match these filters'
                  : 'No expenses recorded yet'}
              </strong>
              <p>
                {yearExpenses.length
                  ? 'Clear the search or choose another category.'
                  : 'Use Add expense or review the spend inbox to start this financial year’s ledger.'}
              </p>
            </div>
          </div>
        )}
      </section>

      <Dialog.Root
        onOpenChange={(open) => {
          if (!open && saving) return;
          setPanelOpen(open);
          if (!open) {
            setEditingId(undefined);
            setDraft(emptyDraft());
            setFormError('');
          }
        }}
        open={panelOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="tax-expense-panel-overlay" />
          <Dialog.Content
            className="tax-expense-panel"
            onCloseAutoFocus={(event) => {
              if (!panelReturnFocusRef.current) return;
              event.preventDefault();
              panelReturnFocusRef.current.focus();
            }}
          >
            <header className="tax-expense-panel__header">
              <div>
                <Eyebrow>{editingId ? 'Update record' : 'New record'}</Eyebrow>
                <Dialog.Title>{editingId ? 'Edit expense' : 'Add an expense'}</Dialog.Title>
                <Dialog.Description>
                  Record the actual amount charged in AUD and keep the invoice reference with it.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <IconButton disabled={saving} label="Close expense panel" variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </header>
            <ExpenseForm
              draft={draft}
              editing={Boolean(editingId)}
              error={formError}
              onCancel={cancelEditing}
              onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
              onSubmit={(event) => void saveExpense(event)}
              saving={saving}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmationDialog
        confirmLabel="Delete expense"
        detail={
          deleteTarget
            ? `${deleteTarget.supplier} · ${deleteTarget.description} · ${audFromCents(deleteTarget.amountCents)}. This cannot be undone.`
            : ''
        }
        error={deleteError}
        isConfirming={deleting}
        onConfirm={() => void deleteExpense()}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(undefined);
        }}
        open={Boolean(deleteTarget)}
        returnFocusRef={deleteTriggerRef}
        title="Delete this expense?"
      />
    </section>
  );
}
