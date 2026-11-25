"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveCustomer, type CustomerFormState, type CustomerFormValues } from "@/actions/customers";
import { VISIT_AREA_LABELS } from "@/config/pricing";
import { SubmitButton } from "./submit-button";
import { Alert, buttonClass, Field, inputClass } from "./ui";

export function CustomerForm({ customerId, initial }: { customerId: string | null; initial: CustomerFormValues }) {
  const [state, formAction] = useActionState<CustomerFormState, FormData>(saveCustomer.bind(null, customerId), {});
  const values = state.values ?? initial;

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="お客様名（個人名または会社名）" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          maxLength={100}
          defaultValue={values.name}
          className={inputClass}
          autoComplete="off"
        />
      </Field>
      <Field label="電話番号" htmlFor="phone">
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          maxLength={30}
          defaultValue={values.phone}
          className={inputClass}
          autoComplete="off"
        />
      </Field>
      <Field label="住所" htmlFor="address">
        <input
          id="address"
          name="address"
          required
          maxLength={200}
          defaultValue={values.address}
          className={inputClass}
          autoComplete="off"
        />
      </Field>
      <fieldset>
        <legend className="mb-1.5 font-bold text-slate-800">市内か市外か</legend>
        <p className="mb-2 text-sm text-slate-600">見積を作るとき、訪問先（出張費）に自動で入ります。</p>
        <div className="grid max-w-md grid-cols-2 gap-3">
          {(["IN_CITY", "OUT_OF_CITY"] as const).map((area) => (
            <label
              key={area}
              className="flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-700 has-checked:border-blue-700 has-checked:bg-blue-700 has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-500"
            >
              <input
                type="radio"
                name="area"
                value={area}
                required
                defaultChecked={values.area === area}
                className="sr-only"
              />
              {VISIT_AREA_LABELS[area]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton size="lg" pendingLabel="保存しています…">
          {customerId ? "この内容で保存する" : "お客様を追加する"}
        </SubmitButton>
        <Link href="/customers" className={buttonClass("ghost", "md")}>
          保存せずに戻る
        </Link>
      </div>
    </form>
  );
}
