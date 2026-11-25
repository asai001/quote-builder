import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocumentSheet } from "@/components/document-sheet";
import { PrintToolbar } from "@/components/print-toolbar";
import { prisma } from "@/lib/prisma";
import { ownScope, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "請求書" };

type Props = { params: Promise<{ id: string }> };

export default function InvoicePrintPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-lg">請求書を用意しています…</p>}>
      <InvoicePrint params={params} />
    </Suspense>
  );
}

async function InvoicePrint({ params }: Props) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);

  const invoice = await prisma.invoice.findFirst({
    where: { id, ...ownScope(user) },
    include: {
      customer: { select: { name: true, address: true } },
      assignee: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) notFound();

  return (
    <>
      <PrintToolbar backHref={`/invoices/${invoice.id}`} backLabel="請求の画面に戻る" />
      <div className="py-6 print:py-0">
        <DocumentSheet
          kind="invoice"
          number={invoice.number}
          issueDate={invoice.issueDate}
          secondDate={invoice.dueDate}
          customer={invoice.customer}
          assigneeName={invoice.assignee.name}
          items={invoice.items}
          subtotal={invoice.subtotal}
          tax={invoice.tax}
          total={invoice.total}
        />
      </div>
    </>
  );
}
