import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InfoList, ItemsTable } from "@/components/items-table";
import { QuoteActions } from "@/components/quote-actions";
import { QuoteStatusBadge } from "@/components/status-badges";
import { Card, CardTitle, LinkButton, LoadingBlock } from "@/components/ui";
import { VISIT_AREA_LABELS } from "@/config/pricing";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { ownScope, requireUser } from "@/lib/session";
import { ResetOnNavigate } from "@/components/reset-on-navigate";

export const metadata: Metadata = { title: "見積の詳細" };

type Props = { params: Promise<{ id: string }> };

export default function QuoteDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<LoadingBlock rows={10} />}>
      <QuoteDetail params={params} />
    </Suspense>
  );
}

async function QuoteDetail({ params }: Props) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);

  // 社員は自分が担当の見積だけ開ける（ほかの人の見積は「見つかりません」になる）
  const quote = await prisma.quote.findFirst({
    where: { id, ...ownScope(user) },
    include: {
      customer: true,
      assignee: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" } },
      invoice: { select: { id: true, number: true } },
    },
  });
  if (!quote) notFound();

  const editable = quote.status !== "INVOICED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-slate-600">
            <Link href="/quotes" className="font-bold text-blue-700 underline underline-offset-4">
              見積一覧
            </Link>
            　＞　見積の詳細
          </p>
          <h1 className="mt-2 flex flex-wrap items-center gap-4 text-3xl font-bold tracking-tight text-slate-900">
            <span className="tabular">{quote.number}</span>
            <QuoteStatusBadge status={quote.status} />
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LinkButton href={`/quotes/${quote.id}/print`} variant="secondary" target="_blank">
            見積書を印刷する
          </LinkButton>
          {editable ? (
            <LinkButton href={`/quotes/${quote.id}/edit`} variant="secondary">
              内容を編集する
            </LinkButton>
          ) : null}
        </div>
      </div>

      <Card className="border-2 border-blue-200 p-6">
        <CardTitle>次にやること</CardTitle>
        <div className="mt-2">
          <ResetOnNavigate>
            <QuoteActions quoteId={quote.id} status={quote.status} invoice={quote.invoice} />
          </ResetOnNavigate>
        </div>
      </Card>

      <Card className="p-6">
        <CardTitle>お客様と担当者</CardTitle>
        <div className="mt-4">
          <InfoList
            rows={[
              { label: "お客様", value: <span className="font-bold">{quote.customer.name} 様</span> },
              { label: "電話番号", value: <span className="tabular">{quote.customer.phone}</span> },
              { label: "住所", value: quote.customer.address },
              { label: "訪問先", value: VISIT_AREA_LABELS[quote.visitArea] },
              { label: "担当者", value: quote.assignee.name },
              { label: "発行日", value: formatDate(quote.issueDate) },
              { label: "有効期限", value: formatDate(quote.validUntil) },
              {
                label: "備考",
                value: quote.notes ? <span className="whitespace-pre-wrap">{quote.notes}</span> : "（なし）",
              },
            ]}
          />
        </div>
      </Card>

      <Card className="p-6">
        <CardTitle>見積の内容</CardTitle>
        <div className="mt-4">
          <ItemsTable items={quote.items} subtotal={quote.subtotal} tax={quote.tax} total={quote.total} />
        </div>
      </Card>
    </div>
  );
}
