import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmployeeSalesChart, MonthlySalesChart } from "@/components/charts";
import { Card, CardTitle, LinkButton, LoadingBlock, PageHeader } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import { formatYen } from "@/lib/format";
import { isAdmin, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "ダッシュボード" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="ダッシュボード">
        <LinkButton href="/quotes/new" size="lg">
          ＋ 見積を作る
        </LinkButton>
      </PageHeader>
      <Suspense fallback={<LoadingBlock rows={8} />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const admin = isAdmin(user);
  const scopeNote = admin ? "会社全体" : `${user.name}さんの担当分`;

  return (
    <div className="space-y-6">
      <p className="text-slate-600">
        {admin ? "会社全体の数字を表示しています。" : "あなたが担当している見積・請求の数字だけを表示しています。"}
        売上は、請求書の発行日を基準にした税抜の金額です。
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label={`今月の売上（${data.thisMonthLabel}）`}
          value={formatYen(data.thisMonthSales)}
          note={`税抜・${scopeNote}`}
        />
        <StatCard
          label="売掛金残高"
          value={formatYen(data.receivableBalance)}
          note={`まだ入金されていない請求 ${data.unpaidCount}件（税込）`}
          href="/receivables"
          linkLabel="一覧を見る"
        />
        <StatCard
          label="期限超過"
          value={`${data.overdueCount}件`}
          note={data.overdueCount > 0 ? "支払期限を過ぎても入金がありません" : "支払期限を過ぎた請求はありません"}
          alert={data.overdueCount > 0}
          href="/invoices?status=overdue"
          linkLabel="一覧を見る"
        />
      </div>

      <Card className="p-6">
        <CardTitle>月別の売上（直近12か月）</CardTitle>
        <p className="mb-4 mt-1 text-slate-600">税抜・{scopeNote}。棒にマウスをのせると金額が出ます。</p>
        <MonthlySalesChart data={data.monthly} />
      </Card>

      {/* 社員別の売上は管理者だけ。社員のときはデータ自体を取っていない */}
      {data.byEmployee ? (
        <Card className="p-6">
          <CardTitle>社員別の売上</CardTitle>
          <p className="mb-4 mt-1 text-slate-600">税抜。期間をボタンで切り替えられます。</p>
          <EmployeeSalesChart data={data.byEmployee} monthLabel={data.thisMonthLabel} />
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  alert = false,
  href,
  linkLabel,
}: {
  label: string;
  value: string;
  note: string;
  alert?: boolean;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <Card className={`p-6 ${alert ? "border-2 border-red-300" : ""}`}>
      <p className="font-bold text-slate-600">{label}</p>
      <p className={`tabular mt-1 text-4xl font-bold ${alert ? "text-red-700" : "text-slate-900"}`}>
        {alert ? <span aria-hidden="true">⚠ </span> : null}
        {value}
      </p>
      <p className={`mt-1 ${alert ? "font-bold text-red-700" : "text-slate-600"}`}>{note}</p>
      {href && linkLabel ? (
        <Link href={href} className="mt-2 inline-block font-bold text-blue-700 underline underline-offset-4">
          {linkLabel}
        </Link>
      ) : null}
    </Card>
  );
}
