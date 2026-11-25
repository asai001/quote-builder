import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, LinkButton, LoadingBlock, PageHeader, Table, Td, Th } from "@/components/ui";
import { formatDateShort, todayJst } from "@/lib/dates";
import { formatYen } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isAdmin, ownScope, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "売掛金（未入金）" };

const DAY_MS = 86_400_000;
/** 一度に表示する件数の上限 */
const MAX_ROWS = 300;

export default function ReceivablesPage() {
  return (
    <>
      <PageHeader
        title="売掛金（未入金）"
        description="請求書を出したあと、まだ入金されていない請求の一覧です。支払期限が近い順に並んでいます。"
      />
      <Suspense fallback={<LoadingBlock rows={10} />}>
        <Receivables />
      </Suspense>
    </>
  );
}

async function Receivables() {
  const user = await requireUser();
  const today = todayJst();
  // 社員は自分が担当の請求だけ
  const unpaid = { ...ownScope(user), paidDate: null };

  // 合計はデータベース側で計算し、一覧と同時に取る
  const [summary, overdue, invoices] = await Promise.all([
    prisma.invoice.aggregate({ where: unpaid, _sum: { total: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({
      where: { ...unpaid, dueDate: { lt: today } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where: unpaid,
      select: {
        id: true,
        number: true,
        issueDate: true,
        dueDate: true,
        total: true,
        customer: { select: { name: true, phone: true } },
        assignee: { select: { name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { number: "asc" }],
      take: MAX_ROWS,
    }),
  ]);

  const admin = isAdmin(user);
  const totalAmount = summary._sum.total ?? 0;
  const overdueAmount = overdue._sum.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <p className="font-bold text-slate-600">売掛金の合計（税込）</p>
          <p className="tabular mt-1 text-4xl font-bold text-slate-900">{formatYen(totalAmount)}</p>
          <p className="tabular mt-1 text-slate-600">未入金の請求 {summary._count._all}件</p>
        </Card>
        <Card className={`p-6 ${overdue._count._all > 0 ? "border-2 border-red-300" : ""}`}>
          <p className="font-bold text-slate-600">うち、支払期限を過ぎているもの</p>
          <p
            className={`tabular mt-1 text-4xl font-bold ${overdue._count._all > 0 ? "text-red-700" : "text-slate-900"}`}
          >
            {formatYen(overdueAmount)}
          </p>
          <p className={`tabular mt-1 ${overdue._count._all > 0 ? "font-bold text-red-700" : "text-slate-600"}`}>
            期限超過 {overdue._count._all}件
          </p>
        </Card>
      </div>

      <Card>
        {invoices.length === 0 ? (
          <EmptyState title="未入金の請求はありません。">すべて入金済みです。</EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>請求番号</Th>
                  <Th>お客様</Th>
                  {admin ? <Th>担当者</Th> : null}
                  <Th>発行日</Th>
                  <Th>支払期限</Th>
                  <Th align="right">金額（税込）</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const overdueDays = Math.floor((today.getTime() - invoice.dueDate.getTime()) / DAY_MS);
                  const isOverdue = overdueDays > 0;
                  return (
                    <tr key={invoice.id} className={isOverdue ? "bg-red-50/60" : "hover:bg-slate-50"}>
                      <Td className="tabular whitespace-nowrap font-bold">
                        <Link href={`/invoices/${invoice.id}`} className="text-blue-700 underline underline-offset-4">
                          {invoice.number}
                        </Link>
                      </Td>
                      <Td className="min-w-44">
                        <span className="font-bold">{invoice.customer.name}</span>
                        <span className="tabular block text-sm text-slate-600">{invoice.customer.phone}</span>
                      </Td>
                      {admin ? <Td className="whitespace-nowrap">{invoice.assignee.name}</Td> : null}
                      <Td className="tabular whitespace-nowrap">{formatDateShort(invoice.issueDate)}</Td>
                      <Td className="whitespace-nowrap">
                        {isOverdue ? (
                          <span className="font-bold text-red-700">
                            <span className="tabular">{formatDateShort(invoice.dueDate)}</span>
                            <span className="block">
                              ⚠ 期限超過（<span className="tabular">{overdueDays}</span>日）
                            </span>
                          </span>
                        ) : (
                          <span className="tabular">{formatDateShort(invoice.dueDate)}</span>
                        )}
                      </Td>
                      <Td
                        align="right"
                        className={`tabular whitespace-nowrap font-bold ${isOverdue ? "text-red-700" : ""}`}
                      >
                        {formatYen(invoice.total)}
                      </Td>
                      <Td align="right">
                        <LinkButton href={`/invoices/${invoice.id}`} variant="secondary" size="sm">
                          {admin ? "入金を登録する" : "開く"}
                        </LinkButton>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {summary._count._all > invoices.length ? (
              <p className="px-4 py-4 text-slate-600">
                支払期限が近い順に {invoices.length}件を表示しています（全{summary._count._all}件）。
              </p>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
