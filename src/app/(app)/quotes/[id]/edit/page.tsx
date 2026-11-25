import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { QuoteForm } from "@/components/quote-form";
import { LoadingBlock, PageHeader } from "@/components/ui";
import { selectionFromItems } from "@/config/pricing";
import { toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { loadQuoteFormOptions } from "@/lib/quote-form-data";
import { ownScope, requireUser } from "@/lib/session";
import { ResetOnNavigate } from "@/components/reset-on-navigate";

export const metadata: Metadata = { title: "見積を編集する" };

type Props = { params: Promise<{ id: string }> };

export default function EditQuotePage({ params }: Props) {
  return (
    <>
      <PageHeader title="見積を編集する" description="内容を変えると、金額は料金表から計算し直されます。" />
      <Suspense fallback={<LoadingBlock rows={8} />}>
        <EditQuoteForm params={params} />
      </Suspense>
    </>
  );
}

async function EditQuoteForm({ params }: Props) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);

  const [quote, options] = await Promise.all([
    prisma.quote.findFirst({
      where: { id, ...ownScope(user) },
      include: {
        items: { select: { code: true, quantity: true } },
        assignee: { select: { name: true } },
      },
    }),
    loadQuoteFormOptions(user),
  ]);

  if (!quote) notFound();
  // 請求済みの見積は編集できない
  if (quote.status === "INVOICED") redirect(`/quotes/${quote.id}`);

  return (
    <ResetOnNavigate>
      <QuoteForm
        quoteId={quote.id}
        quoteNumber={quote.number}
        customers={options.customers}
        assignees={options.assignees}
        assigneeName={quote.assignee.name}
        cancelHref={`/quotes/${quote.id}`}
        initial={{
          customerId: quote.customerId,
          selection: selectionFromItems(quote.items, quote.visitArea),
          assigneeId: quote.assigneeId,
          issueDate: toDateInputValue(quote.issueDate),
          validUntil: toDateInputValue(quote.validUntil),
          notes: quote.notes,
        }}
      />
    </ResetOnNavigate>
  );
}
