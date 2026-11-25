"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { calculateQuote, normalizeSelection, validateSelection } from "@/config/pricing";
import type { QuoteStatus } from "@/generated/prisma/enums";
import { endOfNextMonth, parseDateInput, todayJst } from "@/lib/dates";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_TRANSITIONS } from "@/lib/labels";
import { issueNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { isAdmin, ownScope, requireUser } from "@/lib/session";

export type ActionResult = { error: string };

const quantity = z.number().int().min(0).max(999);
const visitArea = z.enum(["IN_CITY", "OUT_OF_CITY"]);

const quoteInputSchema = z.object({
  customerMode: z.enum(["existing", "new"]),
  customerId: z.string().max(100).optional(),
  newCustomer: z
    .object({
      name: z.string().max(100),
      phone: z.string().max(30),
      address: z.string().max(200),
      area: visitArea,
    })
    .optional(),
  // 画面から受け取るのは「何を何台」だけ。品名・単価・金額は受け取らず、サーバーで料金表から計算する
  selection: z.object({
    units: z.record(z.string(), quantity),
    options: z.record(z.string(), quantity),
    visitArea,
  }),
  assigneeId: z.string().max(100).optional(),
  issueDate: z.string(),
  validUntil: z.string(),
  notes: z.string().max(1000),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;

/** 見積を保存する（quoteId が null なら新規作成、あれば上書き） */
export async function saveQuote(quoteId: string | null, rawInput: QuoteInput): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = quoteInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: "入力内容を確認してください。" };
  }
  const input = parsed.data;

  const selection = normalizeSelection(input.selection);
  const selectionError = validateSelection(selection);
  if (selectionError) return { error: selectionError };

  const issueDate = parseDateInput(input.issueDate);
  const validUntil = parseDateInput(input.validUntil);
  if (!issueDate) return { error: "発行日を入れてください。" };
  if (!validUntil) return { error: "有効期限を入れてください。" };
  if (validUntil.getTime() < issueDate.getTime()) {
    return { error: "有効期限は、発行日と同じ日か、それより後の日にしてください。" };
  }

  let newCustomer: { name: string; phone: string; address: string; area: "IN_CITY" | "OUT_OF_CITY" } | null = null;
  if (input.customerMode === "new") {
    const name = input.newCustomer?.name.trim() ?? "";
    const phone = input.newCustomer?.phone.trim() ?? "";
    const address = input.newCustomer?.address.trim() ?? "";
    if (!name) return { error: "新しいお客様の名前を入れてください。" };
    if (!phone) return { error: "新しいお客様の電話番号を入れてください。" };
    if (!address) return { error: "新しいお客様の住所を入れてください。" };
    newCustomer = { name, phone, address, area: input.newCustomer?.area ?? "IN_CITY" };
  } else if (!input.customerId) {
    return { error: "お客様を選んでください。" };
  }

  // 編集のときは、自分が見られる見積か・請求済みでないかを確かめる
  const existing = quoteId
    ? await prisma.quote.findFirst({
        where: { id: quoteId, ...ownScope(user) },
        select: { id: true, status: true, assigneeId: true },
      })
    : null;
  if (quoteId && !existing) return { error: "この見積は見つかりませんでした。" };
  if (existing?.status === "INVOICED") {
    return { error: "請求済みの見積は編集できません。" };
  }

  // 担当者：社員は必ず自分（編集時は元のまま）。管理者だけが変更できる
  let assigneeId = existing?.assigneeId ?? user.id;
  if (isAdmin(user) && input.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: input.assigneeId }, select: { id: true } });
    if (!assignee) return { error: "担当者を選び直してください。" };
    assigneeId = assignee.id;
  }

  if (!newCustomer) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
    if (!customer) return { error: "お客様を選び直してください。" };
  }

  // 金額は必ずサーバー側で料金表から計算する
  const calc = calculateQuote(selection);
  const notes = input.notes.trim();

  const savedId = await prisma.$transaction(async (tx) => {
    const customerId = newCustomer
      ? (await tx.customer.create({ data: newCustomer, select: { id: true } })).id
      : input.customerId!;

    const data = {
      customerId,
      assigneeId,
      visitArea: selection.visitArea,
      issueDate,
      validUntil,
      subtotal: calc.subtotal,
      tax: calc.tax,
      total: calc.total,
      notes,
    };

    if (existing) {
      // 保存の直前に請求済みになっていた場合は上書きしない
      const updated = await tx.quote.updateMany({
        where: { id: existing.id, status: { not: "INVOICED" } },
        data,
      });
      if (updated.count !== 1) return null;
      await tx.quoteItem.deleteMany({ where: { quoteId: existing.id } });
      await tx.quoteItem.createMany({ data: calc.items.map((item) => ({ ...item, quoteId: existing.id })) });
      return existing.id;
    }

    const number = await issueNumber(tx, "Q", issueDate.getUTCFullYear());
    const created = await tx.quote.create({
      data: { ...data, number, status: "DRAFT", items: { createMany: { data: calc.items } } },
      select: { id: true },
    });
    return created.id;
  });

  if (!savedId) return { error: "請求済みの見積は編集できません。" };

  revalidatePath("/", "layout");
  redirect(`/quotes/${savedId}`);
}

/** 見積の状態を変える（提出済み・受注・失注） */
export async function changeQuoteStatus(quoteId: string, nextStatus: QuoteStatus): Promise<ActionResult | void> {
  const user = await requireUser();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, ...ownScope(user) },
    select: { id: true, status: true },
  });
  if (!quote) return { error: "この見積は見つかりませんでした。" };

  if (!QUOTE_STATUS_TRANSITIONS[quote.status]?.includes(nextStatus)) {
    return {
      error: `「${QUOTE_STATUS_LABELS[quote.status]}」の見積は、その状態に変更できません。画面を読み込み直してください。`,
    };
  }

  const updated = await prisma.quote.updateMany({
    where: { id: quote.id, status: quote.status },
    data: { status: nextStatus },
  });
  if (updated.count !== 1) {
    return { error: "ほかの人が先に変更しました。画面を読み込み直してください。" };
  }

  revalidatePath("/", "layout");
}

/** 受注した見積を請求書に変換する（発行日は今日、支払期限は翌月末） */
export async function convertToInvoice(quoteId: string): Promise<ActionResult> {
  const user = await requireUser();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, ...ownScope(user) },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) return { error: "この見積は見つかりませんでした。" };
  if (quote.status !== "ORDERED") {
    return { error: "請求書に変換できるのは「受注」の見積だけです。" };
  }

  const today = todayJst();

  const invoiceId = await prisma.$transaction(async (tx) => {
    // 「受注」のものだけを「請求済み」に変える。二重に変換されないよう、ここで確かめる
    const updated = await tx.quote.updateMany({
      where: { id: quote.id, status: "ORDERED" },
      data: { status: "INVOICED" },
    });
    if (updated.count !== 1) return null;

    const number = await issueNumber(tx, "INV", today.getUTCFullYear());
    const invoice = await tx.invoice.create({
      data: {
        number,
        quoteId: quote.id,
        customerId: quote.customerId,
        assigneeId: quote.assigneeId,
        issueDate: today,
        dueDate: endOfNextMonth(today),
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        items: {
          createMany: {
            data: quote.items.map((item) => ({
              code: item.code,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              sortOrder: item.sortOrder,
            })),
          },
        },
      },
      select: { id: true },
    });
    return invoice.id;
  });

  if (!invoiceId) return { error: "この見積は、すでに請求書に変換されています。" };

  revalidatePath("/", "layout");
  redirect(`/invoices/${invoiceId}`);
}
