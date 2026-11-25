"use client";

import { useState, useTransition } from "react";
import { changeQuoteStatus, convertToInvoice } from "@/actions/quotes";
import type { QuoteStatus } from "@/generated/prisma/enums";
import { Alert, Button, LinkButton } from "./ui";

type Props = {
  quoteId: string;
  status: QuoteStatus;
  invoice: { id: string; number: string } | null;
};

const GUIDES: Record<QuoteStatus, string> = {
  DRAFT: "お客様に見積をお伝えしたら、「提出済みにする」を押してください。",
  SUBMITTED: "お客様からお返事をもらったら、結果を選んでください。",
  ORDERED: "作業が決まったら、請求書に変換できます。見積の内容がそのまま請求書になります。",
  LOST: "失注にした見積です。まちがえた場合は、状態を戻せます。",
  INVOICED: "請求書に変換済みです。請求済みの見積は編集できません。",
};

/** 見積の状態を変えるボタンと、「請求書に変換」ボタン */
export function QuoteActions({ quoteId, status, invoice }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function change(nextStatus: QuoteStatus, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await changeQuoteStatus(quoteId, nextStatus);
      if (result?.error) setError(result.error);
    });
  }

  function convert() {
    if (!window.confirm("この見積を請求書に変換します。\n変換すると、見積は編集できなくなります。よろしいですか？"))
      return;
    setError(null);
    startTransition(async () => {
      const result = await convertToInvoice(quoteId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <p className="text-slate-700">{GUIDES[status]}</p>
      {error ? (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {status === "DRAFT" ? (
          <Button size="lg" disabled={isPending} onClick={() => change("SUBMITTED")}>
            提出済みにする
          </Button>
        ) : null}

        {status === "SUBMITTED" ? (
          <>
            <Button size="lg" variant="success" disabled={isPending} onClick={() => change("ORDERED")}>
              受注にする
            </Button>
            <Button
              size="lg"
              variant="danger"
              disabled={isPending}
              onClick={() => change("LOST", "この見積を「失注」にします。よろしいですか？")}
            >
              失注にする
            </Button>
          </>
        ) : null}

        {status === "ORDERED" ? (
          <>
            <Button size="lg" variant="success" disabled={isPending} onClick={convert}>
              請求書に変換する
            </Button>
            <Button variant="secondary" disabled={isPending} onClick={() => change("SUBMITTED")}>
              提出済みに戻す
            </Button>
            <Button
              variant="danger"
              disabled={isPending}
              onClick={() => change("LOST", "この見積を「失注」にします。よろしいですか？")}
            >
              失注にする
            </Button>
          </>
        ) : null}

        {status === "LOST" ? (
          <>
            <Button variant="secondary" disabled={isPending} onClick={() => change("SUBMITTED")}>
              提出済みに戻す
            </Button>
            <Button variant="success" disabled={isPending} onClick={() => change("ORDERED")}>
              受注にする
            </Button>
          </>
        ) : null}

        {status === "INVOICED" && invoice ? (
          <LinkButton href={`/invoices/${invoice.id}`} size="lg">
            請求書（{invoice.number}）を開く
          </LinkButton>
        ) : null}

        {isPending ? <span className="font-bold text-slate-600">処理しています…</span> : null}
      </div>
    </div>
  );
}
