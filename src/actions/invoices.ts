"use server";

import { revalidatePath } from "next/cache";
import { formatDate, parseDateInput, todayJst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { isAdmin, ownScope, requireUser } from "@/lib/session";

export type InvoiceActionState = { error?: string; ok?: boolean };

/** 入金日を登録する（管理者だけ） */
export async function registerPayment(
  invoiceId: string,
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "入金の登録は管理者だけが行えます。" };

  const paidDate = parseDateInput(formData.get("paidDate"));
  if (!paidDate) return { error: "入金日を入れてください。" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, issueDate: true, paidDate: true },
  });
  if (!invoice) return { error: "この請求は見つかりませんでした。" };
  if (invoice.paidDate) return { error: "この請求は、すでに入金済みです。" };
  if (paidDate.getTime() > todayJst().getTime()) {
    return { error: "入金日に、今日より先の日付は入れられません。" };
  }
  if (paidDate.getTime() < invoice.issueDate.getTime()) {
    return { error: `入金日は、請求書の発行日（${formatDate(invoice.issueDate)}）以降の日付にしてください。` };
  }

  await prisma.invoice.updateMany({ where: { id: invoice.id, paidDate: null }, data: { paidDate } });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** 入金の登録を取り消して、未入金に戻す（管理者だけ。入力を間違えたとき用） */
export async function cancelPayment(invoiceId: string): Promise<InvoiceActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "入金の取り消しは管理者だけが行えます。" };

  const updated = await prisma.invoice.updateMany({
    where: { id: invoiceId, paidDate: { not: null } },
    data: { paidDate: null },
  });
  if (updated.count !== 1) return { error: "この請求は、入金済みではありません。" };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** 支払期限を変更する（未入金の請求だけ。社員は自分が担当の請求だけ） */
export async function updateDueDate(
  invoiceId: string,
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const user = await requireUser();

  const dueDate = parseDateInput(formData.get("dueDate"));
  if (!dueDate) return { error: "支払期限を入れてください。" };

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...ownScope(user) },
    select: { id: true, issueDate: true, paidDate: true },
  });
  if (!invoice) return { error: "この請求は見つかりませんでした。" };
  if (invoice.paidDate) return { error: "入金済みの請求は、支払期限を変更できません。" };
  if (dueDate.getTime() < invoice.issueDate.getTime()) {
    return { error: `支払期限は、発行日（${formatDate(invoice.issueDate)}）以降の日付にしてください。` };
  }

  await prisma.invoice.updateMany({
    where: { id: invoice.id, paidDate: null, ...ownScope(user) },
    data: { dueDate },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
