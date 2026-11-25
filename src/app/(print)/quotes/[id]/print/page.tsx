import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocumentSheet } from "@/components/document-sheet";
import { PrintToolbar } from "@/components/print-toolbar";
import { prisma } from "@/lib/prisma";
import { ownScope, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "見積書" };

type Props = { params: Promise<{ id: string }> };

export default function QuotePrintPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-lg">見積書を用意しています…</p>}>
      <QuotePrint params={params} />
    </Suspense>
  );
}

async function QuotePrint({ params }: Props) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);

  const quote = await prisma.quote.findFirst({
    where: { id, ...ownScope(user) },
    include: {
      customer: { select: { name: true, address: true } },
      assignee: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!quote) notFound();

  return (
    <>
      <PrintToolbar backHref={`/quotes/${quote.id}`} backLabel="見積の画面に戻る" />
      <div className="py-6 print:py-0">
        <DocumentSheet
          kind="quote"
          number={quote.number}
          issueDate={quote.issueDate}
          secondDate={quote.validUntil}
          customer={quote.customer}
          assigneeName={quote.assignee.name}
          items={quote.items}
          subtotal={quote.subtotal}
          tax={quote.tax}
          total={quote.total}
          notes={quote.notes}
        />
      </div>
    </>
  );
}
