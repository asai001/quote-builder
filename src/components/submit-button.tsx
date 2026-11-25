"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./ui";

/** フォームの送信ボタン。送信中は押せなくなり、文言が変わる */
export function SubmitButton({
  children,
  pendingLabel = "処理しています…",
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, size, className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
