import "server-only";
import type { CustomerOption } from "@/components/quote-form";
import { prisma } from "@/lib/prisma";
import { isAdmin, type CurrentUser } from "@/lib/session";

/** 見積作成・編集画面で使う選択肢（お客様の一覧と、管理者のときだけ担当者の一覧）をまとめて取る */
export async function loadQuoteFormOptions(user: CurrentUser): Promise<{
  customers: CustomerOption[];
  assignees: { id: string; name: string }[] | null;
}> {
  const [customers, assignees] = await Promise.all([
    prisma.customer.findMany({
      select: { id: true, name: true, phone: true, address: true, area: true },
      orderBy: { name: "asc" },
    }),
    isAdmin(user)
      ? prisma.user.findMany({ select: { id: true, name: true }, orderBy: [{ role: "desc" }, { name: "asc" }] })
      : Promise.resolve(null),
  ]);
  return { customers, assignees };
}
