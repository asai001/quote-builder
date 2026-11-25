"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveQuote, type QuoteInput } from "@/actions/quotes";
import {
  calculateQuote,
  countUnits,
  MAX_QUANTITY,
  MULTI_UNIT_DISCOUNT,
  OPTIONS,
  TAX_RATE_PERCENT,
  TRAVEL_FEES,
  UNIT_TYPES,
  validateSelection,
  VISIT_AREA_LABELS,
  type OptionCode,
  type QuoteSelection,
  type UnitCode,
  type VisitArea,
} from "@/config/pricing";
import { formatYen } from "@/lib/format";
import { Alert, Button, buttonClass, Card, Field, inputClass } from "./ui";

export type CustomerOption = {
  id: string;
  name: string;
  phone: string;
  address: string;
  area: VisitArea;
};

export type QuoteFormInitial = {
  customerId: string | null;
  selection: QuoteSelection;
  assigneeId: string;
  issueDate: string;
  validUntil: string;
  notes: string;
};

type Props = {
  /** 編集のときは見積のID。新しく作るときは null */
  quoteId: string | null;
  quoteNumber?: string;
  customers: CustomerOption[];
  /** 担当者の候補（管理者のときだけ渡す。社員のときは null） */
  assignees: { id: string; name: string }[] | null;
  /** 担当者を変えられないときに表示する名前 */
  assigneeName: string;
  initial: QuoteFormInitial;
  cancelHref: string;
};

const VISIT_AREAS: VisitArea[] = ["IN_CITY", "OUT_OF_CITY"];
const VALID_DAYS = 30;

function addDaysToInput(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Date(date.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** 台数が減ったとき、オプションの台数がエアコンの合計台数を超えないようにそろえる */
function clampOptions(selection: QuoteSelection): QuoteSelection {
  const unitCount = countUnits(selection);
  const options = { ...selection.options };
  for (const option of OPTIONS) {
    options[option.code] = Math.min(options[option.code], unitCount);
  }
  return { ...selection, options };
}

export function QuoteForm({ quoteId, quoteNumber, customers, assignees, assigneeName, initial, cancelHref }: Props) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState<string | null>(initial.customerId);
  const [search, setSearch] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "" });
  const [selection, setSelection] = useState<QuoteSelection>(initial.selection);
  const [assigneeId, setAssigneeId] = useState(initial.assigneeId);
  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [validUntilTouched, setValidUntilTouched] = useState(quoteId !== null);
  const [notes, setNotes] = useState(initial.notes);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const calc = useMemo(() => calculateQuote(selection), [selection]);
  const unitCount = calc.unitCount;

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) ?? null,
    [customers, customerId],
  );

  const matches = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const digits = keyword.replace(/[^0-9]/g, "");
    const list = keyword
      ? customers.filter(
          (customer) =>
            customer.name.toLowerCase().includes(keyword) ||
            customer.address.toLowerCase().includes(keyword) ||
            (digits.length >= 2 && customer.phone.replace(/[^0-9]/g, "").includes(digits)),
        )
      : customers;
    return list.slice(0, 50);
  }, [customers, search]);

  function setVisitArea(visitArea: VisitArea) {
    setSelection((current) => ({ ...current, visitArea }));
  }

  function chooseCustomer(customer: CustomerOption) {
    setCustomerId(customer.id);
    // お客様を選ぶと、訪問先（市内・市外）が自動で入る
    setVisitArea(customer.area);
    setSearch("");
    setError(null);
  }

  function changeUnit(code: UnitCode, delta: number) {
    setSelection((current) => {
      const next = Math.max(0, Math.min(MAX_QUANTITY, current.units[code] + delta));
      return clampOptions({ ...current, units: { ...current.units, [code]: next } });
    });
  }

  function changeOption(code: OptionCode, delta: number) {
    setSelection((current) => {
      const limit = Math.min(MAX_QUANTITY, countUnits(current));
      const next = Math.max(0, Math.min(limit, current.options[code] + delta));
      return { ...current, options: { ...current.options, [code]: next } };
    });
  }

  function changeIssueDate(value: string) {
    setIssueDate(value);
    if (!validUntilTouched && value) setValidUntil(addDaysToInput(value, VALID_DAYS));
  }

  function handleSave() {
    setError(null);

    if (customerMode === "existing" && !customerId) {
      setError("お客様を選んでください。");
      return;
    }
    if (customerMode === "new") {
      if (!newCustomer.name.trim()) return setError("新しいお客様の名前を入れてください。");
      if (!newCustomer.phone.trim()) return setError("新しいお客様の電話番号を入れてください。");
      if (!newCustomer.address.trim()) return setError("新しいお客様の住所を入れてください。");
    }
    const selectionError = validateSelection(selection);
    if (selectionError) {
      setError(selectionError);
      return;
    }

    const input: QuoteInput = {
      customerMode,
      customerId: customerMode === "existing" ? (customerId ?? undefined) : undefined,
      newCustomer: customerMode === "new" ? { ...newCustomer, area: selection.visitArea } : undefined,
      selection,
      assigneeId,
      issueDate,
      validUntil,
      notes,
    };

    startTransition(async () => {
      const result = await saveQuote(quoteId, input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
      {/* ---------- 左：入力 ---------- */}
      <div className="space-y-6">
        <Card className="p-6">
          <StepTitle step={1} title="お客様" />
          <div className="mb-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="お客様の入れ方">
            <ChoiceButton selected={customerMode === "existing"} onClick={() => setCustomerMode("existing")}>
              一覧から選ぶ
            </ChoiceButton>
            <ChoiceButton selected={customerMode === "new"} onClick={() => setCustomerMode("new")}>
              新しいお客様を入力する
            </ChoiceButton>
          </div>

          {customerMode === "existing" ? (
            selectedCustomer ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-blue-600 bg-blue-50 p-4">
                <div>
                  <p className="text-xl font-bold text-slate-900">{selectedCustomer.name} 様</p>
                  <p className="mt-1 text-slate-700">
                    {selectedCustomer.phone}　／　{selectedCustomer.address}（{VISIT_AREA_LABELS[selectedCustomer.area]}
                    ）
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setCustomerId(null)}>
                  選び直す
                </Button>
              </div>
            ) : (
              <div>
                <Field
                  label="お客様をさがす"
                  htmlFor="customer-search"
                  hint="名前・電話番号・住所の一部を入れると、下の一覧がしぼり込まれます。"
                >
                  <input
                    id="customer-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="例：山田、090-1234"
                    className={inputClass}
                    autoComplete="off"
                  />
                </Field>
                <ul className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border-2 border-slate-200">
                  {matches.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => chooseCustomer(customer)}
                        className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none"
                      >
                        <span className="text-lg font-bold text-slate-900">{customer.name}</span>
                        <span className="text-sm text-slate-600">
                          {customer.phone}　{customer.address}（{VISIT_AREA_LABELS[customer.area]}）
                        </span>
                      </button>
                    </li>
                  ))}
                  {matches.length === 0 ? (
                    <li className="px-4 py-6 text-center text-slate-600">
                      見つかりませんでした。「新しいお客様を入力する」を押すと、その場で登録できます。
                    </li>
                  ) : null}
                </ul>
              </div>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="お客様名（個人名または会社名）" htmlFor="new-name">
                <input
                  id="new-name"
                  value={newCustomer.name}
                  onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })}
                  maxLength={100}
                  className={inputClass}
                  autoComplete="off"
                />
              </Field>
              <Field label="電話番号" htmlFor="new-phone">
                <input
                  id="new-phone"
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })}
                  maxLength={30}
                  className={inputClass}
                  autoComplete="off"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="住所"
                  htmlFor="new-address"
                  hint="市内か市外かは、下の「訪問先」で選んだ内容で登録されます。"
                >
                  <input
                    id="new-address"
                    value={newCustomer.address}
                    onChange={(event) => setNewCustomer({ ...newCustomer, address: event.target.value })}
                    maxLength={200}
                    className={inputClass}
                    autoComplete="off"
                  />
                </Field>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <StepTitle step={2} title="訪問先" note="お客様を選ぶと自動で入ります。変更もできます。" />
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="訪問先">
            {VISIT_AREAS.map((area) => (
              <ChoiceButton key={area} selected={selection.visitArea === area} onClick={() => setVisitArea(area)}>
                <span className="text-xl">{VISIT_AREA_LABELS[area]}</span>
                <span className="mt-0.5 block text-sm font-normal">出張費 {formatYen(TRAVEL_FEES[area].price)}</span>
              </ChoiceButton>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <StepTitle
            step={3}
            title="エアコンの種類と台数"
            note={`合計が${MULTI_UNIT_DISCOUNT.fromUnit}台以上になると、${MULTI_UNIT_DISCOUNT.fromUnit}台目以降は1台につき${formatYen(MULTI_UNIT_DISCOUNT.amountPerUnit)}引きになります。`}
          />
          <div className="divide-y divide-slate-100">
            {UNIT_TYPES.map((unit) => (
              <QuantityRow
                key={unit.code}
                name={unit.name}
                unitPrice={unit.unitPrice}
                quantity={selection.units[unit.code]}
                canIncrease={selection.units[unit.code] < MAX_QUANTITY}
                onChange={(delta) => changeUnit(unit.code, delta)}
              />
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <StepTitle step={4} title="オプション" note="オプションの台数は、エアコンの合計台数まで入れられます。" />
          <div className="divide-y divide-slate-100">
            {OPTIONS.map((option) => (
              <QuantityRow
                key={option.code}
                name={option.name}
                unitPrice={option.unitPrice}
                quantity={selection.options[option.code]}
                canIncrease={selection.options[option.code] < Math.min(MAX_QUANTITY, unitCount)}
                onChange={(delta) => changeOption(option.code, delta)}
              />
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <StepTitle step={5} title="担当者・日付・備考" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {assignees ? (
                <Field label="担当者" htmlFor="assignee">
                  <select
                    id="assignee"
                    value={assigneeId}
                    onChange={(event) => setAssigneeId(event.target.value)}
                    className={inputClass}
                  >
                    {assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div>
                  <p className="mb-1.5 font-bold text-slate-800">担当者</p>
                  <p className="flex min-h-12 items-center rounded-lg bg-slate-100 px-4 text-lg font-bold text-slate-800">
                    {assigneeName}
                  </p>
                </div>
              )}
            </div>
            <Field label="発行日" htmlFor="issue-date">
              <input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(event) => changeIssueDate(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="有効期限" htmlFor="valid-until" hint={`ふつうは発行日の${VALID_DAYS}日後です。`}>
              <input
                id="valid-until"
                type="date"
                value={validUntil}
                onChange={(event) => {
                  setValidUntil(event.target.value);
                  setValidUntilTouched(true);
                }}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="備考（見積書に載ります）" htmlFor="notes">
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="例：駐車場あり。午前中の訪問を希望。"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      {/* ---------- 右：内訳（入力するたびにすぐ変わる） ---------- */}
      <div>
        <Card className="p-6 xl:sticky xl:top-6">
          <h2 className="text-xl font-bold text-slate-900">
            見積の内訳
            {quoteNumber ? <span className="ml-2 text-base font-normal text-slate-600">{quoteNumber}</span> : null}
          </h2>

          <div aria-live="polite">
            {unitCount === 0 ? (
              <p className="mt-4 rounded-lg bg-slate-100 px-4 py-6 text-center text-slate-600">
                エアコンの台数を入れると、
                <br />
                ここに金額が出ます。
              </p>
            ) : (
              <ul className="mt-4 space-y-2 border-b border-slate-200 pb-4">
                {calc.items.map((item) => (
                  <li key={item.code} className="flex items-baseline justify-between gap-3">
                    <span className="text-slate-800">
                      {item.name}
                      {item.code.startsWith("travel_") ? null : (
                        <span className="tabular whitespace-nowrap text-slate-600"> × {item.quantity}台</span>
                      )}
                    </span>
                    <span
                      className={`tabular whitespace-nowrap font-bold ${item.amount < 0 ? "text-red-700" : "text-slate-900"}`}
                    >
                      {formatYen(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-4 space-y-2">
              <SummaryRow label={`本体（${unitCount}台）`} value={formatYen(calc.unitsTotal)} />
              <SummaryRow label="オプション" value={formatYen(calc.optionsTotal)} />
              <SummaryRow
                label={`出張費（${VISIT_AREA_LABELS[selection.visitArea]}）`}
                value={formatYen(calc.travelFee)}
              />
              <SummaryRow
                label={calc.discountUnits > 0 ? `割引（${calc.discountUnits}台分）` : "割引"}
                value={formatYen(-calc.discount)}
                negative={calc.discount > 0}
              />
              <div className="border-t border-slate-200 pt-2">
                <SummaryRow label="小計（税抜）" value={formatYen(calc.subtotal)} strong />
              </div>
              <SummaryRow label={`消費税（${TAX_RATE_PERCENT}%）`} value={formatYen(calc.tax)} />
            </dl>

            <div className="mt-4 rounded-lg bg-blue-50 px-4 py-4">
              <p className="font-bold text-blue-900">合計（税込）</p>
              <p className="tabular text-right text-4xl font-bold text-blue-900">{formatYen(calc.total)}</p>
            </div>
          </div>

          {error ? (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            <Button size="lg" className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending ? "保存しています…" : quoteId ? "この内容で保存する" : "見積書を保存する"}
            </Button>
            <Link href={cancelHref} className={buttonClass("ghost", "md", "w-full")}>
              保存せずに戻る
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepTitle({ step, title, note }: { step: number; title: string; note?: string }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-3 text-xl font-bold text-slate-900">
        <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg text-white">
          {step}
        </span>
        {title}
      </h2>
      {note ? <p className="mt-2 text-slate-600">{note}</p> : null}
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`min-h-14 rounded-lg border-2 px-4 py-2 text-center text-lg font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
        selected
          ? "border-blue-700 bg-blue-700 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function QuantityRow({
  name,
  unitPrice,
  quantity,
  canIncrease,
  onChange,
}: {
  name: string;
  unitPrice: number;
  quantity: number;
  canIncrease: boolean;
  onChange: (delta: number) => void;
}) {
  const stepButton =
    "flex h-14 w-14 items-center justify-center rounded-lg border-2 text-3xl font-bold leading-none transition-colors " +
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-500 " +
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div>
        <p className="text-lg font-bold text-slate-900">{name}</p>
        <p className="tabular text-slate-600">1台 {formatYen(unitPrice)}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${name}を1台減らす`}
          disabled={quantity <= 0}
          onClick={() => onChange(-1)}
          className={`${stepButton} border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
        >
          −
        </button>
        <p className="w-20 text-center" aria-live="polite">
          <span className={`tabular text-3xl font-bold ${quantity > 0 ? "text-blue-800" : "text-slate-400"}`}>
            {quantity}
          </span>
          <span className="ml-1 text-slate-600">台</span>
        </p>
        <button
          type="button"
          aria-label={`${name}を1台増やす`}
          disabled={!canIncrease}
          onClick={() => onChange(1)}
          className={`${stepButton} border-blue-700 bg-blue-700 text-white hover:bg-blue-800`}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
  negative = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-bold text-slate-900" : "text-slate-700"}>{label}</dt>
      <dd
        className={`tabular whitespace-nowrap ${strong ? "text-xl font-bold text-slate-900" : "font-bold"} ${negative ? "text-red-700" : "text-slate-900"}`}
      >
        {value}
      </dd>
    </div>
  );
}
