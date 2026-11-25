import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/components/search-box";
import { PaymentStatusBadge } from "@/components/status-badges";
import {
  Card,
  EmptyState,
  FilterTabs,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Pagination,
  Table,
  Td,
  Th,
} from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { formatDateShort, todayJst } from "@/lib/dates";
import { formatYen } from "@/lib/format";
import { getPaymentStatus } from "@/lib/labels";
import { buildHref, firstValue, PAGE_SIZE, pageNumber, type SearchParams } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { isAdmin, ownScope, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "請求一覧" };

const FILTERS = ["paid", "unpaid", "overdue"] as const;
type Filter = (typeof FILTERS)[number];

export default function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        title="請求一覧"
        description="請求書は、受注した見積の画面にある「請求書に変換する」ボタンから作ります。"
      />
      <Suspense fallback={<LoadingBlock rows={10} />}>
        <InvoiceList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function InvoiceList({ searchParams }: { searchParams: SearchParams }) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);

  const filterParam = firstValue(params.status).toLowerCase();
  const filter = (FILTERS as readonly string[]).includes(filterParam) ? (filterParam as Filter) : null;
  const keyword = firstValue(params.q).trim().slice(0, 50);
  const page = pageNumber(params.page);
  const today = todayJst();

  // 社員は自分が担当の請求だけ
  const scope: Prisma.InvoiceWhereInput = {
    ...ownScope(user),
    ...(keyword
      ? {
          OR: [
            { number: { contains: keyword, mode: "insensitive" } },
            { customer: { name: { contains: keyword, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  // 入金済み：入金日あり ／ 未入金：入金日なし・期限内 ／ 期限超過：入金日なし・期限切れ
  const filterWhere: Record<Filter, Prisma.InvoiceWhereInput> = {
    paid: { paidDate: { not: null } },
    unpaid: { paidDate: null, dueDate: { gte: today } },
    overdue: { paidDate: null, dueDate: { lt: today } },
  };
  const where: Prisma.InvoiceWhereInput = filter ? { ...scope, ...filterWhere[filter] } : scope;

  // 一覧と、タブに出す件数を同時に取る
  const [invoices, allCount, paidCount, overdueCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        number: true,
        issueDate: true,
        dueDate: true,
        paidDate: true,
        total: true,
        customer: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.invoice.count({ where: scope }),
    prisma.invoice.count({ where: { ...scope, ...filterWhere.paid } }),
    prisma.invoice.count({ where: { ...scope, ...filterWhere.overdue } }),
  ]);

  const counts: Record<Filter, number> = {
    paid: paidCount,
    overdue: overdueCount,
    unpaid: allCount - paidCount - overdueCount,
  };
  const total = filter ? counts[filter] : allCount;
  const showAssignee = isAdmin(user);

  const tabs = [
    { key: "all", label: "すべて", href: buildHref("/invoices", { q: keyword }), count: allCount },
    {
      key: "unpaid",
      label: "未入金",
      href: buildHref("/invoices", { status: "unpaid", q: keyword }),
      count: counts.unpaid,
    },
    {
      key: "overdue",
      label: "期限超過",
      href: buildHref("/invoices", { status: "overdue", q: keyword }),
      count: counts.overdue,
    },
    {
      key: "paid",
      label: "入金済み",
      href: buildHref("/invoices", { status: "paid", q: keyword }),
      count: counts.paid,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterTabs tabs={tabs} current={filter ?? "all"} />
        <SearchBox
          action="/invoices"
          defaultValue={keyword}
          placeholder="お客様名・請求番号でさがす"
          hidden={{ status: filter ?? undefined }}
        />
      </div>

      <Card>
        {invoices.length === 0 ? (
          <EmptyState title="あてはまる請求はありません。">
            {keyword || filter ? (
              <Link href="/invoices" className="font-bold text-blue-700 underline">
                すべての請求を表示する
              </Link>
            ) : null}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>請求番号</Th>
                  <Th>発行日</Th>
                  <Th>お客様</Th>
                  {showAssignee ? <Th>担当者</Th> : null}
                  <Th>支払期限</Th>
                  <Th>入金</Th>
                  <Th align="right">合計（税込）</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const status = getPaymentStatus(invoice, today);
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <Td className="tabular whitespace-nowrap font-bold">
                        <Link href={`/invoices/${invoice.id}`} className="text-blue-700 underline underline-offset-4">
                          {invoice.number}
                        </Link>
                      </Td>
                      <Td className="tabular whitespace-nowrap">{formatDateShort(invoice.issueDate)}</Td>
                      <Td className="min-w-44 font-bold">{invoice.customer.name}</Td>
                      {showAssignee ? <Td className="whitespace-nowrap">{invoice.assignee.name}</Td> : null}
                      <Td
                        className={`tabular whitespace-nowrap ${status === "OVERDUE" ? "font-bold text-red-700" : ""}`}
                      >
                        {formatDateShort(invoice.dueDate)}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <PaymentStatusBadge status={status} />
                        {invoice.paidDate ? (
                          <span className="tabular ml-2 text-sm text-slate-600">
                            {formatDateShort(invoice.paidDate)}
                          </span>
                        ) : null}
                      </Td>
                      <Td align="right" className="tabular whitespace-nowrap font-bold">
                        {formatYen(invoice.total)}
                      </Td>
                      <Td align="right">
                        <LinkButton href={`/invoices/${invoice.id}`} variant="secondary" size="sm">
                          開く
                        </LinkButton>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              hrefFor={(next) => buildHref("/invoices", { status: filter ?? undefined, q: keyword, page: next })}
            />
          </>
        )}
      </Card>
    </div>
  );
}
