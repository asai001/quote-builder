import type { Metadata } from "next";
import { Suspense } from "react";
import { QuoteForm } from "@/components/quote-form";
import { LoadingBlock, PageHeader } from "@/components/ui";
import { emptySelection } from "@/config/pricing";
import { addDays, todayJst, toDateInputValue } from "@/lib/dates";
import { loadQuoteFormOptions } from "@/lib/quote-form-data";
import { requireUser } from "@/lib/session";
import { ResetOnNavigate } from "@/components/reset-on-navigate";

export const metadata: Metadata = { title: "見積を作る" };

export default function NewQuotePage() {
  return (
    <>
      <PageHeader
        title="見積を作る"
        description="お客様・エアコンの台数・オプションを選ぶだけで、料金表どおりの金額が出ます。"
      />
      <Suspense fallback={<LoadingBlock rows={8} />}>
        <NewQuoteForm />
      </Suspense>
    </>
  );
}

async function NewQuoteForm() {
  const user = await requireUser();
  const { customers, assignees } = await loadQuoteFormOptions(user);
  const today = todayJst();

  return (
    <ResetOnNavigate>
      <QuoteForm
        quoteId={null}
        customers={customers}
        assignees={assignees}
        assigneeName={user.name}
        cancelHref="/quotes"
        initial={{
          customerId: null,
          selection: emptySelection(),
          // 担当者は、ログインしている人が自動で入る
          assigneeId: user.id,
          issueDate: toDateInputValue(today),
          validUntil: toDateInputValue(addDays(today, 30)),
          notes: "",
        }}
      />
    </ResetOnNavigate>
  );
}
