/** 画面のURLに付く条件（?status=...&page=... など）の型と読み取り */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function pageNumber(value: string | string[] | undefined): number {
  const page = Number.parseInt(firstValue(value), 10);
  return Number.isFinite(page) && page >= 1 ? Math.min(page, 100_000) : 1;
}

/** 条件付きのURLを作る（空の条件は付けない） */
export function buildHref(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || (key === "page" && value === 1)) continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export const PAGE_SIZE = 50;
