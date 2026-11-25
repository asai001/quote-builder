"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="rounded-xl border-2 border-red-200 bg-white px-6 py-14 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">うまく表示できませんでした</h1>
      <p className="mt-3 text-slate-600">
        少し時間をおいて、もう一度お試しください。何度も出るときは、管理者にお知らせください。
      </p>
      <div className="mt-6">
        <Button onClick={() => retry()}>もう一度ためす</Button>
      </div>
    </div>
  );
}
