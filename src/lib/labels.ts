import type { QuoteStatus, Role } from "@/generated/prisma/enums";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "下書き",
  SUBMITTED: "提出済み",
  ORDERED: "受注",
  LOST: "失注",
  INVOICED: "請求済み",
};

export const QUOTE_STATUS_ORDER: QuoteStatus[] = ["DRAFT", "SUBMITTED", "ORDERED", "LOST", "INVOICED"];

/**
 * 見積の状態を、どの状態からどの状態へ変えられるか。
 * 下書き → 提出済み → 受注 / 失注 → （請求書に変換すると）請求済み
 * 押し間違いを直せるように、受注・失注は提出済みに戻せる。
 * 請求済みはここからは変えられない。
 */
export const QUOTE_STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["ORDERED", "LOST"],
  ORDERED: ["SUBMITTED", "LOST"],
  LOST: ["SUBMITTED", "ORDERED"],
  INVOICED: [],
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "管理者",
  EMPLOYEE: "社員",
};

/** 請求の入金状況（画面表示用。データベースには持たず、入金日と支払期限から決める） */
export type PaymentStatus = "PAID" | "UNPAID" | "OVERDUE";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: "入金済み",
  UNPAID: "未入金",
  OVERDUE: "期限超過",
};

export function getPaymentStatus(invoice: { paidDate: Date | null; dueDate: Date }, today: Date): PaymentStatus {
  if (invoice.paidDate) return "PAID";
  return invoice.dueDate.getTime() < today.getTime() ? "OVERDUE" : "UNPAID";
}
