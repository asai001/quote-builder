import type { Metadata } from "next";
import { APP_NAME, COMPANY } from "@/config/company";
import { LoginForm } from "./login-form";
import { ResetOnNavigate } from "@/components/reset-on-navigate";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-slate-600">{COMPANY.name}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{APP_NAME}</h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-900">ログイン</h2>
          <ResetOnNavigate>
            <LoginForm />
          </ResetOnNavigate>
        </div>
        <p className="mt-5 text-center text-sm text-slate-600">
          パスワードが分からないときは、管理者にお問い合わせください。
        </p>
      </div>
    </main>
  );
}
