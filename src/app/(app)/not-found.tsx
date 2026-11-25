import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">このページは見つかりませんでした</h1>
      <p className="mt-3 text-slate-600">すでに無くなっているか、あなたの担当ではないため開けません。</p>
      <div className="mt-6">
        <LinkButton href="/">ダッシュボードに戻る</LinkButton>
      </div>
    </div>
  );
}
