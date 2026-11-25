"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber, formatYen } from "@/lib/format";

/* グラフの色。値は src/app/globals.css の --color-chart-* と同じ */
const SERIES = "var(--color-chart-series)";
const GRID = "var(--color-chart-grid)";
const TEXT = "var(--color-chart-text)";

/** 軸の目盛り：1,234,000 → 「123万」 */
function formatAxisYen(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) >= 10_000) return `${formatNumber(Math.round(value / 10_000))}万`;
  return formatNumber(value);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly { value?: unknown }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="tabular text-xl font-bold text-slate-900">{formatYen(Number(payload[0].value ?? 0))}</p>
    </div>
  );
}

/* ---------- 直近12か月の月別売上 ---------- */

export function MonthlySalesChart({ data }: { data: { month: string; label: string; sales: number }[] }) {
  const rows = data.map((row) => ({ ...row, short: `${Number(row.month.slice(5))}月` }));
  return (
    <div>
      <div className="h-80 w-full" role="img" aria-label="直近12か月の月別売上の棒グラフ">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: 8 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tickFormatter={(_, index) => rows[index]?.short ?? ""}
              tick={{ fill: TEXT, fontSize: 14 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval={0}
            />
            <YAxis
              tickFormatter={formatAxisYen}
              tick={{ fill: TEXT, fontSize: 14 }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
            <Bar
              dataKey="sales"
              name="売上"
              fill={SERIES}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        caption="月別の売上を数字で見る"
        headers={["月", "売上（税抜）"]}
        rows={data.map((row) => [row.label, formatYen(row.sales)])}
      />
    </div>
  );
}

/* ---------- 社員別の売上（今月 / 直近12か月を切り替え） ---------- */

type Period = "month" | "year";

export function EmployeeSalesChart({
  data,
  monthLabel,
}: {
  data: { id: string; name: string; monthSales: number; yearSales: number }[];
  monthLabel: string;
}) {
  const [period, setPeriod] = useState<Period>("month");

  const rows = data
    .map((row) => ({ id: row.id, name: row.name, sales: period === "month" ? row.monthSales : row.yearSales }))
    .sort((a, b) => b.sales - a.sales || a.name.localeCompare(b.name, "ja"));
  const periodLabel = period === "month" ? `今月（${monthLabel}）` : "直近12か月";
  const hasSales = rows.some((row) => row.sales > 0);

  return (
    <div>
      <div
        className="mb-4 inline-flex rounded-lg border-2 border-slate-300 bg-white p-1"
        role="radiogroup"
        aria-label="集計する期間"
      >
        {(
          [
            { key: "month", label: "今月" },
            { key: "year", label: "直近12か月" },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={period === option.key}
            onClick={() => setPeriod(option.key)}
            className={`min-h-11 rounded-md px-5 font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              period === option.key ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {hasSales ? (
        <div
          className="w-full"
          style={{ height: Math.max(200, rows.length * 56 + 40) }}
          role="img"
          aria-label={`社員別の売上の棒グラフ（${periodLabel}）`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 120, bottom: 0, left: 8 }}
              barCategoryGap="30%"
            >
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis
                type="number"
                tickFormatter={formatAxisYen}
                tick={{ fill: TEXT, fontSize: 14 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#0f172a", fontSize: 15, fontWeight: 700 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                width={120}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
              <Bar
                dataKey="sales"
                name="売上"
                fill={SERIES}
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="sales"
                  position="right"
                  formatter={(value: unknown) => formatYen(Number(value ?? 0))}
                  style={{ fill: "#0f172a", fontSize: 15, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-100 px-4 py-10 text-center text-slate-600">
          {periodLabel}の売上は、まだありません。
        </p>
      )}

      <DataTable
        caption={`社員別の売上を数字で見る（${periodLabel}）`}
        headers={["社員", "売上（税抜）"]}
        rows={rows.map((row) => [row.name, formatYen(row.sales)])}
      />
    </div>
  );
}

/** グラフと同じ内容の表（グラフが見づらいとき用） */
function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: string[][] }) {
  return (
    <details className="mt-3">
      <summary className="inline-block cursor-pointer rounded-md px-2 py-1 font-bold text-blue-700 underline underline-offset-4">
        {caption}
      </summary>
      <table className="mt-2 w-full max-w-md border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200 text-sm text-slate-600">
            <th scope="col" className="px-3 py-2 text-left font-bold">
              {headers[0]}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-bold">
              {headers[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-slate-100">
              <td className="px-3 py-2">{row[0]}</td>
              <td className="tabular px-3 py-2 text-right font-bold">{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
