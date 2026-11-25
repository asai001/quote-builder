import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/components/search-box";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Pagination,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { VISIT_AREA_LABELS } from "@/config/pricing";
import type { Prisma } from "@/generated/prisma/client";
import { buildHref, firstValue, PAGE_SIZE, pageNumber, type SearchParams } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "お客様一覧" };

export default function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title="お客様一覧">
        <LinkButton href="/customers/new" size="lg">
          ＋ お客様を追加する
        </LinkButton>
      </PageHeader>
      <Suspense fallback={<LoadingBlock rows={10} />}>
        <CustomerList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CustomerList({ searchParams }: { searchParams: SearchParams }) {
  const [params] = await Promise.all([searchParams, requireUser()]);
  const keyword = firstValue(params.q).trim().slice(0, 50);
  const page = pageNumber(params.page);

  const where: Prisma.CustomerWhereInput = keyword
    ? {
        OR: [
          { name: { contains: keyword, mode: "insensitive" } },
          { phone: { contains: keyword } },
          { address: { contains: keyword, mode: "insensitive" } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: { id: true, name: true, phone: true, address: true, area: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.customer.count({ where }),
  ]);

  return (
    <div className="space-y-4">
      <SearchBox action="/customers" defaultValue={keyword} placeholder="名前・電話番号・住所でさがす" />
      <Card>
        {customers.length === 0 ? (
          <EmptyState title="あてはまるお客様はいません。">
            {keyword ? (
              <Link href="/customers" className="font-bold text-blue-700 underline">
                すべてのお客様を表示する
              </Link>
            ) : null}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>お客様名</Th>
                  <Th>電話番号</Th>
                  <Th>住所</Th>
                  <Th>市内／市外</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <Td className="min-w-44 font-bold">{customer.name}</Td>
                    <Td className="tabular whitespace-nowrap">{customer.phone}</Td>
                    <Td className="min-w-56">{customer.address}</Td>
                    <Td>
                      <Badge tone={customer.area === "IN_CITY" ? "blue" : "amber"}>
                        {VISIT_AREA_LABELS[customer.area]}
                      </Badge>
                    </Td>
                    <Td align="right">
                      <LinkButton href={`/customers/${customer.id}/edit`} variant="secondary" size="sm">
                        編集する
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
              hrefFor={(next) => buildHref("/customers", { q: keyword, page: next })}
            />
          </>
        )}
      </Card>
    </div>
  );
}
