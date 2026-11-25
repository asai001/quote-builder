import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CancelPaymentButton, DueDateForm, PaymentForm } from "@/components/invoice-forms";
import { InfoList, ItemsTable } from "@/components/items-table";
import { PaymentStatusBadge } from "@/components/status-badges";
import { Card, CardTitle, LinkButton, LoadingBlock } from "@/components/ui";
import { formatDate, toDateInputValue, todayJst } from "@/lib/dates";
import { getPaymentStatus } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { isAdmin, ownScope, requireUser } from "@/lib/session";
import { ResetOnNavigate } from "@/components/reset-on-navigate";

export const metadata: Metadata = { title: "請求の詳細" };

type Props = { params: Promise<{ id: string }> };

export default function InvoiceDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<LoadingBlock rows={10} />}>
      <InvoiceDetail params={params} />
    </Suspense>
  );
}

async function InvoiceDetail({ params }: Props) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);

  // 社員は自分が担当の請求だけ開ける
  const invoice = await prisma.invoice.findFirst({
    where: { id, ...ownScope(user) },
    include: {
      customer: true,
      assignee: { select: { name: true } },
      quote: { select: { id: true, number: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) notFound();

  const today = todayJst();
  const status = getPaymentStatus(invoice, today);
  const admin = isAdmin(user);

  return (
    <ResetOnNavigate>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-slate-600">
              <Link href="/invoices" className="font-bold text-blue-700 underline underline-offset-4">
                請求一覧
              </Link>
              　＞　請求の詳細
            </p>
            <h1 className="mt-2 flex flex-wrap items-center gap-4 text-3xl font-bold tracking-tight text-slate-900">
              <span className="tabular">{invoice.number}</span>
              <PaymentStatusBadge status={status} />
            </h1>
          </div>
          <LinkButton href={`/invoices/${invoice.id}/print`} size="lg" target="_blank">
            請求書を印刷する
          </LinkButton>
        </div>

        <Card className={`border-2 p-6 ${status === "OVERDUE" ? "border-red-300" : "border-blue-200"}`}>
          <CardTitle>入金の状況</CardTitle>
          <div className="mt-3 space-y-4">
            {status === "PAID" ? (
              <p className="text-lg">
                <span className="font-bold text-emerald-800">{formatDate(invoice.paidDate)}</span> に入金済みです。
              </p>
            ) : status === "OVERDUE" ? (
              <p className="text-lg font-bold text-red-700">
                期限超過：支払期限（{formatDate(invoice.dueDate)}）を過ぎていますが、まだ入金がありません。
              </p>
            ) : (
              <p className="text-lg">まだ入金がありません。支払期限は {formatDate(invoice.dueDate)} です。</p>
            )}

            {/* 入金の登録・取り消しは管理者だけ。社員の画面には表示しない（サーバー側でも拒否する） */}
            {admin && status !== "PAID" ? (
              <PaymentForm
                invoiceId={invoice.id}
                today={toDateInputValue(today)}
                minDate={toDateInputValue(invoice.issueDate)}
              />
            ) : null}
            {admin && status === "PAID" ? <CancelPaymentButton invoiceId={invoice.id} /> : null}
          </div>
        </Card>

        <Card className="p-6">
          <CardTitle>お客様と担当者</CardTitle>
          <div className="mt-4">
            <InfoList
              rows={[
                { label: "お客様", value: <span className="font-bold">{invoice.customer.name} 様</span> },
                { label: "電話番号", value: <span className="tabular">{invoice.customer.phone}</span> },
                { label: "住所", value: invoice.customer.address },
                { label: "担当者", value: invoice.assignee.name },
                { label: "発行日", value: formatDate(invoice.issueDate) },
                { label: "支払期限", value: formatDate(invoice.dueDate) },
                {
                  label: "元の見積",
                  value: (
                    <Link
                      href={`/quotes/${invoice.quote.id}`}
                      className="tabular font-bold text-blue-700 underline underline-offset-4"
                    >
                      {invoice.quote.number}
                    </Link>
                  ),
                },
              ]}
            />
          </div>
        </Card>

        <Card className="p-6">
          <CardTitle>請求の内容</CardTitle>
          <div className="mt-4">
            <ItemsTable items={invoice.items} subtotal={invoice.subtotal} tax={invoice.tax} total={invoice.total} />
          </div>
        </Card>

        {status !== "PAID" ? (
          <Card className="p-6">
            <CardTitle>支払期限を変更する</CardTitle>
            <p className="mt-2 text-slate-600">お客様と相談して期限を変えたときに使います。</p>
            <div className="mt-4">
              <DueDateForm
                key={toDateInputValue(invoice.dueDate)}
                invoiceId={invoice.id}
                dueDate={toDateInputValue(invoice.dueDate)}
                minDate={toDateInputValue(invoice.issueDate)}
              />
            </div>
          </Card>
        ) : null}
      </div>
    </ResetOnNavigate>
  );
}
