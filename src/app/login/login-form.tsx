"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="メールアドレス" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="パスワード" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="ログインしています…">
        ログイン
      </SubmitButton>
    </form>
  );
}
