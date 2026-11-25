/**
 * 料金表と計算ルール（税抜・円）
 *
 * 見積作成画面・サーバー側の保存処理・デモデータ（シード）のすべてが
 * このファイルだけを参照する。料金を変えるときはここだけ直せばよい。
 */

export type VisitArea = "IN_CITY" | "OUT_OF_CITY";

/** エアコン本体のクリーニング */
export const UNIT_TYPES = [
  { code: "wall_standard", name: "壁掛けエアコン（通常）", unitPrice: 10_000 },
  { code: "wall_auto_clean", name: "壁掛けエアコン（お掃除機能付き）", unitPrice: 18_000 },
  { code: "ceiling", name: "天井埋込エアコン", unitPrice: 25_000 },
] as const;

/** オプション */
export const OPTIONS = [
  { code: "outdoor_unit", name: "室外機洗浄", unitPrice: 4_000 },
  { code: "anti_mold", name: "防カビコート", unitPrice: 2_000 },
] as const;

/** 出張費（1回の訪問につき） */
export const TRAVEL_FEES: Record<VisitArea, { code: string; name: string; price: number }> = {
  IN_CITY: { code: "travel_in_city", name: "出張費（市内）", price: 0 },
  OUT_OF_CITY: { code: "travel_out_of_city", name: "出張費（市外）", price: 3_000 },
};

/** 割引：本体の合計が2台以上のとき、2台目以降は1台につき2,000円引き（種類は問わない） */
export const MULTI_UNIT_DISCOUNT = {
  code: "discount_multi_unit",
  name: "割引（2台目以降）",
  /** この台数目から割引の対象になる */
  fromUnit: 2,
  amountPerUnit: 2_000,
} as const;

/** 消費税率（%） */
export const TAX_RATE_PERCENT = 10;

/** 1つの項目に入力できる台数の上限 */
export const MAX_QUANTITY = 99;

export const VISIT_AREA_LABELS: Record<VisitArea, string> = {
  IN_CITY: "市内",
  OUT_OF_CITY: "市外",
};

export type UnitCode = (typeof UNIT_TYPES)[number]["code"];
export type OptionCode = (typeof OPTIONS)[number]["code"];

/** 見積で選ぶ内容（これだけあれば金額はすべて計算できる） */
export type QuoteSelection = {
  units: Record<UnitCode, number>;
  options: Record<OptionCode, number>;
  visitArea: VisitArea;
};

/** 見積明細・請求明細の1行 */
export type LineItem = {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
};

export type QuoteCalculation = {
  items: LineItem[];
  /** 本体の合計台数 */
  unitCount: number;
  /** 本体の料金 */
  unitsTotal: number;
  /** オプションの料金 */
  optionsTotal: number;
  /** 出張費 */
  travelFee: number;
  /** 割引の対象台数 */
  discountUnits: number;
  /** 割引額（正の数。小計からこの額を引く） */
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
};

export function emptySelection(visitArea: VisitArea = "IN_CITY"): QuoteSelection {
  return {
    units: { wall_standard: 0, wall_auto_clean: 0, ceiling: 0 },
    options: { outdoor_unit: 0, anti_mold: 0 },
    visitArea,
  };
}

function toQuantity(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_QUANTITY);
}

/** 画面や保存データから来た値を、0〜上限の整数にそろえる */
export function normalizeSelection(input: {
  units?: Partial<Record<string, unknown>>;
  options?: Partial<Record<string, unknown>>;
  visitArea?: unknown;
}): QuoteSelection {
  const selection = emptySelection(input.visitArea === "OUT_OF_CITY" ? "OUT_OF_CITY" : "IN_CITY");
  for (const unit of UNIT_TYPES) {
    selection.units[unit.code] = toQuantity(input.units?.[unit.code]);
  }
  for (const option of OPTIONS) {
    selection.options[option.code] = toQuantity(input.options?.[option.code]);
  }
  return selection;
}

/** 本体の合計台数 */
export function countUnits(selection: QuoteSelection): number {
  return UNIT_TYPES.reduce((sum, unit) => sum + selection.units[unit.code], 0);
}

/** 消費税（1円未満切り捨て） */
export function calculateTax(subtotal: number): number {
  return Math.floor((subtotal * TAX_RATE_PERCENT) / 100);
}

/**
 * 選んだ内容から、明細と金額をすべて計算する。
 *
 *   小計 ＝ 本体の料金 ＋ オプションの料金 ＋ 出張費 − 割引
 *   消費税 ＝ 小計 × 10%（1円未満切り捨て）
 *   合計 ＝ 小計 ＋ 消費税
 *
 * 台数が0の項目は明細に出さない。
 */
export function calculateQuote(selection: QuoteSelection): QuoteCalculation {
  const items: LineItem[] = [];
  const push = (item: Omit<LineItem, "amount" | "sortOrder">) => {
    items.push({ ...item, amount: item.unitPrice * item.quantity, sortOrder: items.length + 1 });
  };

  let unitsTotal = 0;
  for (const unit of UNIT_TYPES) {
    const quantity = selection.units[unit.code];
    if (quantity <= 0) continue;
    unitsTotal += unit.unitPrice * quantity;
    push({ code: unit.code, name: unit.name, quantity, unitPrice: unit.unitPrice });
  }

  let optionsTotal = 0;
  for (const option of OPTIONS) {
    const quantity = selection.options[option.code];
    if (quantity <= 0) continue;
    optionsTotal += option.unitPrice * quantity;
    push({ code: option.code, name: option.name, quantity, unitPrice: option.unitPrice });
  }

  const unitCount = countUnits(selection);
  const discountUnits = Math.max(0, unitCount - (MULTI_UNIT_DISCOUNT.fromUnit - 1));
  const discount = discountUnits * MULTI_UNIT_DISCOUNT.amountPerUnit;
  if (discountUnits > 0) {
    push({
      code: MULTI_UNIT_DISCOUNT.code,
      name: MULTI_UNIT_DISCOUNT.name,
      quantity: discountUnits,
      unitPrice: -MULTI_UNIT_DISCOUNT.amountPerUnit,
    });
  }

  const travel = TRAVEL_FEES[selection.visitArea];
  const travelFee = travel.price;
  push({ code: travel.code, name: travel.name, quantity: 1, unitPrice: travel.price });

  const subtotal = unitsTotal + optionsTotal + travelFee - discount;
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  return {
    items,
    unitCount,
    unitsTotal,
    optionsTotal,
    travelFee,
    discountUnits,
    discount,
    subtotal,
    tax,
    total,
  };
}

/**
 * 見積として保存できる内容かを確かめる。問題があれば理由（日本語）を返す。
 * 画面とサーバーの両方で同じチェックを使う。
 */
export function validateSelection(selection: QuoteSelection): string | null {
  const unitCount = countUnits(selection);
  if (unitCount <= 0) {
    return "エアコンの台数を1台以上入れてください。";
  }
  for (const option of OPTIONS) {
    if (selection.options[option.code] > unitCount) {
      return `${option.name}の台数は、エアコンの合計台数（${unitCount}台）以下にしてください。`;
    }
  }
  return null;
}

/** 保存済みの明細から、選んだ内容（台数）を復元する。見積の編集画面で使う */
export function selectionFromItems(items: { code: string; quantity: number }[], visitArea: VisitArea): QuoteSelection {
  const selection = emptySelection(visitArea);
  for (const item of items) {
    if (item.code in selection.units) {
      selection.units[item.code as UnitCode] = toQuantity(item.quantity);
    } else if (item.code in selection.options) {
      selection.options[item.code as OptionCode] = toQuantity(item.quantity);
    }
  }
  return selection;
}
