"use client";

import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";

/**
 * 画面を開き直すたびに、中の入力内容を最初の状態に戻す。
 *
 * Next.js は、前に開いた画面の入力内容を覚えていて、同じ画面をもう一度開くと元に戻す。
 * そのままだと「見積を保存 → もう一度『見積を作る』を開く」と前の入力が残ってしまうため、
 * メニューやボタンから開き直したときは空に戻す。
 * （ブラウザの「戻る」「進む」で戻ったときは、入力途中の内容がそのまま残る）
 */
export function ResetOnNavigate({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
