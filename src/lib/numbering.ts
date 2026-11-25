import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/**
 * 見積番号（Q-2026-0001）・請求番号（INV-2026-0001）を発行する。
 * 連番は NumberSequence テーブルで年ごとに管理し、1回の問い合わせで
 * 「1つ進めて、その値を受け取る」ので、同時に保存されても番号が重ならない。
 */
export async function issueNumber(tx: Prisma.TransactionClient, prefix: "Q" | "INV", year: number): Promise<string> {
  const key = `${prefix}-${year}`;
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "NumberSequence" ("key", "value")
    VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "NumberSequence"."value" + 1
    RETURNING "value"
  `;
  return formatDocumentNumber(prefix, year, rows[0].value);
}

export function formatDocumentNumber(prefix: "Q" | "INV", year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}
