"use client";

import Link from "next/link";
import { buttonClass } from "./ui";

/** 印刷用画面の上に出すボタン（印刷した紙には出ない） */
export function PrintToolbar({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-slate-300 bg-white px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={() => window.print()} className={buttonClass("primary", "lg")}>
            印刷する
          </button>
          <p className="mt-1 text-sm text-slate-600">
            印刷の画面で、送信先に「PDFに保存」を選ぶと、PDFファイルにできます。
          </p>
        </div>
        <Link href={backHref} className={buttonClass("secondary", "md")}>
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
