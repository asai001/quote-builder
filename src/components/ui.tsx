import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---------- ボタン ---------- */

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold transition-colors " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-500 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const buttonVariants = {
  primary: "bg-blue-700 text-white hover:bg-blue-800",
  secondary: "border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
  success: "bg-emerald-700 text-white hover:bg-emerald-800",
  danger: "border-2 border-red-300 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-blue-700 hover:bg-blue-50",
} as const;

const buttonSizes = {
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-7 text-lg",
  sm: "min-h-10 px-4 text-sm",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = ""): string {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" {...props} className={buttonClass(variant, size, className)} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

/* ---------- 画面の見出し ---------- */

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-2 text-slate-600">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

/* ---------- カード ---------- */

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-bold text-slate-900">{children}</h2>;
}

/* ---------- バッジ（状態の表示） ---------- */

const badgeTones = {
  gray: "bg-slate-100 text-slate-700 ring-slate-300",
  blue: "bg-blue-50 text-blue-800 ring-blue-300",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  amber: "bg-amber-50 text-amber-900 ring-amber-300",
  red: "bg-red-50 text-red-700 ring-red-300",
  violet: "bg-violet-50 text-violet-800 ring-violet-300",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ring-1 ring-inset ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ---------- お知らせ（エラーなど） ---------- */

export function Alert({ tone = "error", children }: { tone?: "error" | "info" | "success"; children: ReactNode }) {
  const tones = {
    error: "border-red-300 bg-red-50 text-red-800",
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border-2 px-4 py-3 font-bold ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

/* ---------- 入力欄 ---------- */

export const inputClass =
  "block w-full min-h-12 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-lg text-slate-900 " +
  "placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-200";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block font-bold text-slate-800">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-sm text-slate-600">{hint}</p> : null}
    </div>
  );
}

/* ---------- 一覧の表 ---------- */

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-left">{children}</table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children?: ReactNode; align?: "left" | "right" | "center" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 ${alignClass}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td className={`border-b border-slate-100 px-4 py-3.5 align-middle ${alignClass} ${className}`}>{children}</td>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-lg font-bold text-slate-700">{title}</p>
      {children ? <div className="mt-3 text-slate-600">{children}</div> : null}
    </div>
  );
}

/* ---------- 絞り込みのタブ ---------- */

export function FilterTabs({
  tabs,
  current,
}: {
  tabs: { key: string; label: string; href: string; count?: number }[];
  current: string;
}) {
  return (
    <nav aria-label="絞り込み" className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 font-bold transition-colors ${
              active
                ? "bg-slate-800 text-white"
                : "border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className={`tabular text-sm ${active ? "text-slate-200" : "text-slate-500"}`}>{tab.count}件</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/* ---------- ページ送り ---------- */

export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <p className="tabular text-slate-600">
        全{total}件のうち {from}〜{to}件目
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <LinkButton href={hrefFor(page - 1)} variant="secondary" size="sm">
              ← 前のページ
            </LinkButton>
          ) : null}
          <span className="tabular text-slate-600">
            {page} / {pageCount} ページ
          </span>
          {page < pageCount ? (
            <LinkButton href={hrefFor(page + 1)} variant="secondary" size="sm">
              次のページ →
            </LinkButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- 読み込み中の表示 ---------- */

export function LoadingBlock({ rows = 6, label = "読み込んでいます…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-4 font-bold text-slate-500">{label}</p>
      <div className="animate-pulse space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="h-10 rounded-md bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
