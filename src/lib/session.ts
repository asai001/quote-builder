import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/** ログインしている人を返す（ログインしていなければ null）。1回の表示の中では結果を使い回す */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string | null; email?: string | null; role?: Role } | undefined;
  if (!user?.id || (user.role !== "ADMIN" && user.role !== "EMPLOYEE")) return null;
  return { id: user.id, name: user.name ?? "", email: user.email ?? "", role: user.role };
});

/** ログイン必須。ログインしていなければログイン画面へ移動させる */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function isAdmin(user: CurrentUser): boolean {
  return user.role === "ADMIN";
}

/**
 * 見られる見積・請求の範囲。
 * 管理者はすべて、社員は自分が担当のものだけ。
 * 一覧・詳細・集計・更新のすべてで、この条件を必ず付ける。
 */
export function ownScope(user: CurrentUser): { assigneeId?: string } {
  return isAdmin(user) ? {} : { assigneeId: user.id };
}
