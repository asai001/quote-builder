const numberFormatter = new Intl.NumberFormat("ja-JP");

/** 12,000（3桁区切り。マイナスは「−2,000」と表示する） */
export function formatNumber(amount: number): string {
  const text = numberFormatter.format(Math.abs(amount));
  return amount < 0 ? `−${text}` : text;
}

/** 12,000円 */
export function formatYen(amount: number): string {
  return `${formatNumber(amount)}円`;
}
