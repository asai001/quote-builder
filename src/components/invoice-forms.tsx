"use client";

import { useActionState, useState, useTransition } from "react";
import { cancelPayment, registerPayment, updateDueDate, type InvoiceActionState } from "@/actions/invoices";
import { SubmitButton } from "./submit-button";
import { Alert, Button, Field, inputClass } from "./ui";

const initialState: InvoiceActionState = {};

/** 入金日の登録（管理者だけに表示する） */
export function PaymentForm({ invoiceId, today, minDate }: { invoiceId: string; today: string; minDate: string }) {
  const [state, formAction] = useActionState(registerPayment.bind(null, invoiceId), initialState);
  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Field label="入金日" htmlFor="paidDate">
            <input
              id="paidDate"
              name="paidDate"
              type="date"
              required
              defaultValue={today}
              min={minDate}
              max={today}
              className={inputClass}
            />
          </Field>
        </div>
        <SubmitButton variant="success" size="md" pendingLabel="登録しています…">
          入金を登録する
        </SubmitButton>
      </div>
    </form>
  );
}

/** 入金の取り消し（管理者だけに表示する） */
export function CancelPaymentButton({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("入金の登録を取り消して、未入金に戻します。よろしいですか？")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelPayment(invoiceId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}
      <Button variant="danger" size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "取り消しています…" : "入金の登録を取り消す"}
      </Button>
    </div>
  );
}

/** 支払期限の変更（未入金のあいだだけ） */
export function DueDateForm({ invoiceId, dueDate, minDate }: { invoiceId: string; dueDate: string; minDate: string }) {
  const [state, formAction] = useActionState(updateDueDate.bind(null, invoiceId), initialState);
  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">支払期限を変更しました。</Alert> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Field label="支払期限" htmlFor="dueDate">
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              required
              defaultValue={dueDate}
              min={minDate}
              className={inputClass}
            />
          </Field>
        </div>
        <SubmitButton variant="secondary" pendingLabel="変更しています…">
          支払期限を変更する
        </SubmitButton>
      </div>
    </form>
  );
}
