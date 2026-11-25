/**
 * 日付の扱い
 *
 * 発行日・有効期限・支払期限・入金日は「時刻を持たない日付」として扱う。
 * プログラムの中では「その日の UTC 0時」の Date で表し、
 * 「今日」は日本時間（JST）で決める。サーバーが UTC で動いていても日付がずれない。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 日本時間での「今日」 */
export function todayJst(now: Date = new Date()): Date {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** その月の1日 */
export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** 月を足し引きした月の1日 */
export function addMonthsToMonthStart(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/** 翌月末（請求書の支払期限） */
export function endOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 0));
}

/** 2026-11-25 の形（日付入力欄の値） */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 日付入力欄の値（2026-11-25）を Date にする。正しくなければ null */
export function parseDateInput(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateInputValue(date) !== value) return null;
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) return null;
  return date;
}

/** 2026年11月25日 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

/** 2026/11/25（一覧用の短い形） */
export function formatDateShort(date: Date | null | undefined): string {
  if (!date) return "";
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}/${m}/${d}`;
}
