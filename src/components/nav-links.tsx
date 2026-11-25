"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "ダッシュボード" },
  { href: "/quotes", label: "見積一覧" },
  { href: "/invoices", label: "請求一覧" },
  { href: "/receivables", label: "売掛金（未入金）" },
  { href: "/customers", label: "お客様一覧" },
] as const;

function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/quotes" && pathname.startsWith("/quotes/new")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ pathname }: { pathname: string | null }) {
  const creating = pathname?.startsWith("/quotes/new") ?? false;
  return (
    <nav aria-label="メニュー" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
      <Link
        href="/quotes/new"
        aria-current={creating ? "page" : undefined}
        className={`inline-flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-lg font-bold text-white transition-colors lg:mb-3 ${
          creating ? "bg-blue-500" : "bg-blue-600 hover:bg-blue-500"
        }`}
      >
        <span aria-hidden="true">＋</span>見積を作る
      </Link>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-12 shrink-0 items-center rounded-lg px-4 font-bold transition-colors ${
              active ? "bg-slate-600 text-white" : "text-slate-200 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** 左のメニュー（今いる画面を強調する） */
export function NavLinks() {
  const pathname = usePathname();
  return <NavList pathname={pathname} />;
}

/** 画面の場所が決まる前に出す、強調なしのメニュー */
export function NavLinksFallback() {
  return <NavList pathname={null} />;
}
