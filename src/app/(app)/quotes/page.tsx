import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/components/search-box";
import { QuoteStatusBadge } from "@/components/status-badges";
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
import type { QuoteStatus } from "@/generated/prisma/enums";
import { formatDateShort } from "@/lib/dates";
import { formatYen } from "@/lib/format";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_ORDER } from "@/lib/labels";
import { buildHref, firstValue, PAGE_SIZE, pageNumber, type SearchParams } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { isAdmin, ownScope, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "見積一覧" };

export default function QuotesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title="見積一覧">
        <LinkButton href="/quotes/new" size="lg">
          ＋ 見積を作る
        </LinkButton>
      </PageHeader>
      <Suspense fallback={<LoadingBlock rows={10} />}>
        <QuoteList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function QuoteList({ searchParams }: { searchParams: SearchParams }) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);

  const statusParam = firstValue(params.status).toUpperCase();
  const status = (QUOTE_STATUS_ORDER as string[]).includes(statusParam) ? (statusParam as QuoteStatus) : null;
  const keyword = firstValue(params.q).trim().slice(0, 50);
  const page = pageNumber(params.page);

  // 社員は自分が担当の見積だけ。この条件を一覧にも件数にも必ず付ける
  const scope: Prisma.QuoteWhereInput = {
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
  const where: Prisma.QuoteWhereInput = status ? { ...scope, status } : scope;

  // 一覧と件数を、まとめて同時に取る（1件ずつは問い合わせない）
  const [quotes, statusCounts] = await Promise.all([
    prisma.quote.findMany({
      where,
      select: {
        id: true,
        number: true,
        issueDate: true,
        status: true,
        total: true,
        customer: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.quote.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
  ]);

  const countByStatus = new Map(statusCounts.map((row) => [row.status, row._count._all]));
  const allCount = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const total = status ? (countByStatus.get(status) ?? 0) : allCount;
  const showAssignee = isAdmin(user);

  const tabs = [
    { key: "ALL", label: "すべて", href: buildHref("/quotes", { q: keyword }), count: allCount },
    ...QUOTE_STATUS_ORDER.map((key) => ({
      key,
      label: QUOTE_STATUS_LABELS[key],
      href: buildHref("/quotes", { status: key.toLowerCase(), q: keyword }),
      count: countByStatus.get(key) ?? 0,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterTabs tabs={tabs} current={status ?? "ALL"} />
        <SearchBox
          action="/quotes"
          defaultValue={keyword}
          placeholder="お客様名・見積番号でさがす"
          hidden={{ status: status?.toLowerCase() }}
        />
      </div>

      <Card>
        {quotes.length === 0 ? (
          <EmptyState title="あてはまる見積はありません。">
            {keyword || status ? (
              <Link href="/quotes" className="font-bold text-blue-700 underline">
                すべての見積を表示する
              </Link>
            ) : null}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>見積番号</Th>
                  <Th>発行日</Th>
                  <Th>お客様</Th>
                  {showAssignee ? <Th>担当者</Th> : null}
                  <Th>状態</Th>
                  <Th align="right">合計（税込）</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50">
                    <Td className="tabular whitespace-nowrap font-bold">
                      <Link href={`/quotes/${quote.id}`} className="text-blue-700 underline underline-offset-4">
                        {quote.number}
                      </Link>
                    </Td>
                    <Td className="tabular whitespace-nowrap">{formatDateShort(quote.issueDate)}</Td>
                    <Td className="min-w-44 font-bold">{quote.customer.name}</Td>
                    {showAssignee ? <Td className="whitespace-nowrap">{quote.assignee.name}</Td> : null}
                    <Td>
                      <QuoteStatusBadge status={quote.status} />
                    </Td>
                    <Td align="right" className="tabular whitespace-nowrap font-bold">
                      {formatYen(quote.total)}
                    </Td>
                    <Td align="right">
                      <LinkButton href={`/quotes/${quote.id}`} variant="secondary" size="sm">
                        開く
                      </LinkButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              hrefFor={(next) => buildHref("/quotes", { status: status?.toLowerCase(), q: keyword, page: next })}
            />
          </>
        )}
      </Card>
    </div>
  );
}
