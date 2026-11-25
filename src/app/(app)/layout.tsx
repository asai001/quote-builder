import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/actions/auth";
import { NavLinks, NavLinksFallback } from "@/components/nav-links";
import { APP_NAME } from "@/config/company";
import { ROLE_LABELS } from "@/lib/labels";
import { requireUser } from "@/lib/session";

/** ログインしている人の名前とログアウトボタン */
async function UserPanel() {
  const user = await requireUser();
  return (
    <div className="flex items-center justify-between gap-3 lg:block">
      <div className="lg:mb-3">
        <p className="font-bold text-white">{user.name}</p>
        <p className="text-sm text-slate-300">{ROLE_LABELS[user.role]}</p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="min-h-11 w-full rounded-lg border-2 border-slate-500 px-4 font-bold text-slate-100 transition-colors hover:bg-slate-700"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print bg-slate-800 px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:px-4 lg:py-6">
        <Link
          href="/"
          className="mb-4 block whitespace-nowrap text-lg font-bold leading-snug text-white lg:mb-6 lg:px-2"
        >
          {APP_NAME}
        </Link>
        <Suspense fallback={<NavLinksFallback />}>
          <NavLinks />
        </Suspense>
        <div className="mt-4 border-t border-slate-600 pt-4 lg:mt-auto lg:px-2">
          <Suspense fallback={<div className="h-20" aria-hidden="true" />}>
            <UserPanel />
          </Suspense>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
