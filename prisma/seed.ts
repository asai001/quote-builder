/**
 * デモ用データ（シード）
 *
 * - ユーザーが1人もいないときだけデータを入れる。すでにデータがあれば何もしない
 * - 金額はすべて src/config/pricing.ts の料金表と計算ルールで計算する
 * - 乱数は固定のシード値を使うので、同じ日に実行すれば何度でも同じ結果になる
 * - 接続は「直結」の DATABASE_URL を使う
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  calculateQuote,
  emptySelection,
  type QuoteSelection,
  type UnitCode,
  type VisitArea,
} from "../src/config/pricing";
import { PrismaClient } from "../src/generated/prisma/client";
import type { QuoteStatus, Role } from "../src/generated/prisma/enums";
import { addDays, endOfNextMonth, todayJst } from "../src/lib/dates";

const RANDOM_SEED = 20260401;
const DEMO_PASSWORD = "demo1234";
const DAY_MS = 86_400_000;

/* ---------- 固定シードの乱数（mulberry32） ---------- */

function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** min〜max の整数（両端を含む） */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    chance: (probability: number) => next() < probability,
    /** 重み付きで1つ選ぶ */
    weighted: <T>(choices: readonly (readonly [T, number])[]): T => {
      const total = choices.reduce((sum, [, weight]) => sum + weight, 0);
      let point = next() * total;
      for (const [value, weight] of choices) {
        point -= weight;
        if (point < 0) return value;
      }
      return choices[choices.length - 1][0];
    },
  };
}

/* ---------- 元になるデータ ---------- */

type SeedUser = { id: string; name: string; email: string; role: Role };

const ADMIN: SeedUser = { id: "seed-user-admin", name: "管理者", email: "admin@example.com", role: "ADMIN" };

/** 社員。share＝見積件数の割合、winRate＝受注率（グラフで違いが見えるように差をつける） */
const EMPLOYEES: (SeedUser & { share: number; winRate: number })[] = [
  { id: "seed-user-sato", name: "佐藤 健一", email: "sato@example.com", role: "EMPLOYEE", share: 34, winRate: 0.74 },
  {
    id: "seed-user-suzuki",
    name: "鈴木 美咲",
    email: "suzuki@example.com",
    role: "EMPLOYEE",
    share: 28,
    winRate: 0.66,
  },
  {
    id: "seed-user-takahashi",
    name: "高橋 大輔",
    email: "takahashi@example.com",
    role: "EMPLOYEE",
    share: 22,
    winRate: 0.52,
  },
  { id: "seed-user-tanaka", name: "田中 由美", email: "tanaka@example.com", role: "EMPLOYEE", share: 16, winRate: 0.4 },
];

type SeedCustomer = { id: string; name: string; phone: string; address: string; area: VisitArea; isCompany: boolean };

/** お客様30件（すべて架空。個人宅18件・会社12件、市内20件・市外10件） */
const CUSTOMER_SOURCE: [name: string, isCompany: boolean, area: VisitArea, address: string][] = [
  ["青木 誠", false, "IN_CITY", "青葉市中央町2丁目4-11"],
  ["石川 さくら", false, "IN_CITY", "青葉市桜台1丁目8-3"],
  ["上田 健太", false, "OUT_OF_CITY", "若草市みなみ野3丁目2-15"],
  ["大野 美穂", false, "IN_CITY", "青葉市緑が丘4丁目1-7"],
  ["小川 直樹", false, "IN_CITY", "青葉市本町3丁目12-5 コーポ本町202"],
  ["加藤 由紀", false, "OUT_OF_CITY", "緑野町大字川辺118-4"],
  ["木下 拓海", false, "IN_CITY", "青葉市東町1丁目6-20"],
  ["小林 恵", false, "IN_CITY", "青葉市若葉町2丁目9-1"],
  ["斎藤 翔", false, "OUT_OF_CITY", "若草市北台1丁目5-9"],
  ["清水 陽子", false, "IN_CITY", "青葉市松原5丁目3-14"],
  ["杉山 大地", false, "IN_CITY", "青葉市西町2丁目7-6 メゾン西町305"],
  ["中村 千夏", false, "IN_CITY", "青葉市桜台3丁目1-22"],
  ["西村 隆", false, "OUT_OF_CITY", "緑野町大字山手52-1"],
  ["野口 麻衣", false, "IN_CITY", "青葉市中央町5丁目10-2"],
  ["長谷川 悟", false, "IN_CITY", "青葉市緑が丘1丁目4-18"],
  ["藤田 香織", false, "OUT_OF_CITY", "若草市みなみ野1丁目11-3"],
  ["松井 涼", false, "IN_CITY", "青葉市本町1丁目2-9"],
  ["森 明美", false, "IN_CITY", "青葉市若葉町4丁目6-13"],
  ["株式会社ひだまり空間企画", true, "IN_CITY", "青葉市中央町1丁目1-5 ひだまりビル3階"],
  ["有限会社こもれび木工舎", true, "OUT_OF_CITY", "緑野町大字川辺240"],
  ["みどりの丘デンタルオフィス青葉", true, "IN_CITY", "青葉市緑が丘2丁目5-1"],
  ["喫茶そよかぜ亭 青葉店", true, "IN_CITY", "青葉市本町2丁目3-8"],
  ["株式会社あさぎりホーム青葉", true, "IN_CITY", "青葉市東町3丁目14-2"],
  ["つばめ進学教室 若草校", true, "OUT_OF_CITY", "若草市北台2丁目8-1 北台プラザ2階"],
  ["炭火ダイニングほたる火", true, "IN_CITY", "青葉市中央町3丁目7-12"],
  ["ヘアサロン・ルミエ青葉", true, "IN_CITY", "青葉市桜台2丁目2-4"],
  ["合同会社なないろ図案室", true, "IN_CITY", "青葉市西町1丁目9-15 西町テラス101"],
  ["こぐまの森こども園", true, "OUT_OF_CITY", "若草市みなみ野2丁目6-6"],
  ["株式会社やまびこ配送サービス", true, "OUT_OF_CITY", "緑野町大字山手301-2"],
  ["ひまわり調剤 青葉中央店", true, "IN_CITY", "青葉市中央町4丁目2-1"],
];

const CUSTOMERS: SeedCustomer[] = CUSTOMER_SOURCE.map(([name, isCompany, area, address], index) => {
  const serial = String(index + 1).padStart(2, "0");
  return {
    id: `seed-customer-${serial}`,
    name,
    isCompany,
    area,
    address,
    // 電話番号はダミーとすぐ分かる番号にする
    phone: isCompany ? `000-000-02${serial}` : `090-0000-01${serial}`,
  };
});

const NOTE_SAMPLES = [
  "駐車場あり。",
  "午前中の訪問を希望。",
  "土曜日の作業を希望。",
  "室外機はベランダにあります。",
  "作業の前日にお電話します。",
  "営業時間外（18時以降）の作業を希望。",
];

/* ---------- 見積・請求を作る ---------- */

type SeedItem = { code: string; name: string; quantity: number; unitPrice: number; amount: number; sortOrder: number };

type SeedQuote = {
  id: string;
  number: string;
  customerId: string;
  assigneeId: string;
  visitArea: VisitArea;
  issueDate: Date;
  validUntil: Date;
  status: QuoteStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  items: SeedItem[];
};

type SeedInvoice = {
  id: string;
  number: string;
  quoteId: string;
  customerId: string;
  assigneeId: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  tax: number;
  total: number;
  paidDate: Date | null;
  items: SeedItem[];
};

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/** その月に作る見積の件数（1か月まるごとの場合）。夏（6〜8月）と年末（12月）は多め */
function monthlyQuoteCount(month: number, random: ReturnType<typeof createRandom>): number {
  if (month >= 6 && month <= 8) return random.int(34, 40);
  if (month === 12) return random.int(32, 38);
  return random.int(20, 28);
}

function pickSelection(customer: SeedCustomer, random: ReturnType<typeof createRandom>): QuoteSelection {
  const selection = emptySelection(customer.area);

  // 1件あたり1〜5台。会社は台数が多めで天井埋込が中心、個人宅は壁掛けが中心
  const unitCount = customer.isCompany
    ? random.weighted([
        [1, 15],
        [2, 25],
        [3, 25],
        [4, 20],
        [5, 15],
      ] as const)
    : random.weighted([
        [1, 42],
        [2, 33],
        [3, 15],
        [4, 7],
        [5, 3],
      ] as const);
  const typeWeights: readonly (readonly [UnitCode, number])[] = customer.isCompany
    ? [
        ["ceiling", 55],
        ["wall_standard", 30],
        ["wall_auto_clean", 15],
      ]
    : [
        ["wall_standard", 58],
        ["wall_auto_clean", 39],
        ["ceiling", 3],
      ];
  for (let i = 0; i < unitCount; i++) {
    selection.units[random.weighted(typeWeights)] += 1;
  }

  // オプションは付けたり付けなかったり。台数はエアコンの合計台数まで
  if (random.chance(0.45)) {
    selection.options.outdoor_unit = random.chance(0.5) ? unitCount : random.int(1, unitCount);
  }
  if (random.chance(0.5)) {
    selection.options.anti_mold = random.chance(0.6) ? unitCount : random.int(1, unitCount);
  }
  return selection;
}

export function generateDemoData(today: Date) {
  const random = createRandom(RANDOM_SEED);

  // 今日から過去12か月分（12か月前の同じ日 〜 今日）
  const rangeStart = utcDate(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate());

  type Draft = { issueDate: Date; order: number };
  const drafts: Draft[] = [];
  let order = 0;
  for (
    let monthStart = utcDate(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1);
    monthStart.getTime() <= today.getTime();
    monthStart = utcDate(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)
  ) {
    const year = monthStart.getUTCFullYear();
    const monthIndex = monthStart.getUTCMonth();
    const daysInMonth = utcDate(year, monthIndex + 1, 0).getUTCDate();
    const firstDay = Math.max(1, monthStart.getTime() < rangeStart.getTime() ? rangeStart.getUTCDate() : 1);
    const isCurrentMonth = year === today.getUTCFullYear() && monthIndex === today.getUTCMonth();
    const lastDay = isCurrentMonth ? today.getUTCDate() : daysInMonth;
    if (firstDay > lastDay) continue;

    // 月の途中から／途中までの月は、日数の割合に合わせて件数を減らす
    const fullCount = monthlyQuoteCount(monthIndex + 1, random);
    const count = Math.max(1, Math.round((fullCount * (lastDay - firstDay + 1)) / daysInMonth));
    for (let i = 0; i < count; i++) {
      drafts.push({ issueDate: utcDate(year, monthIndex, random.int(firstDay, lastDay)), order: order++ });
    }
  }
  // 発行日の古い順に番号を付ける
  drafts.sort((a, b) => a.issueDate.getTime() - b.issueDate.getTime() || a.order - b.order);

  const quotes: SeedQuote[] = [];
  const invoiceDrafts: Omit<SeedInvoice, "id" | "number">[] = [];
  const quoteSequence = new Map<number, number>();

  for (const draft of drafts) {
    const issueDate = draft.issueDate;
    const year = issueDate.getUTCFullYear();
    const sequence = (quoteSequence.get(year) ?? 0) + 1;
    quoteSequence.set(year, sequence);
    const serial = String(quotes.length + 1).padStart(4, "0");

    const employee = random.weighted(EMPLOYEES.map((item) => [item, item.share] as const));
    const customer = random.weighted(CUSTOMERS.map((item) => [item, item.isCompany ? 1.2 : 1] as const));
    const calc = calculateQuote(pickSelection(customer, random));
    const age = daysBetween(issueDate, today);

    // 状態を決める：担当者ごとの受注率で受注し、受注したものは後日、請求書へ変換する
    const won = random.chance(employee.winRate);
    // 受注の返事は見積の1〜7日後、請求書は作業が終わったあと（受注の1〜14日後）に出す
    const decisionDays = random.int(1, 7);
    const invoiceDate = addDays(issueDate, decisionDays + random.int(1, 14));
    const roll = random.next();
    let status: QuoteStatus;
    if (won) {
      if (invoiceDate.getTime() <= today.getTime()) status = "INVOICED";
      else if (decisionDays <= age) status = "ORDERED";
      else status = age >= 3 || roll < 0.4 ? "SUBMITTED" : "DRAFT";
    } else if (age > 45) {
      status = roll < 0.92 ? "LOST" : "SUBMITTED";
    } else if (age > 10) {
      status = roll < 0.6 ? "LOST" : "SUBMITTED";
    } else if (age > 3) {
      status = roll < 0.65 ? "SUBMITTED" : roll < 0.85 ? "DRAFT" : "LOST";
    } else {
      // ここ数日の見積は、まだ下書きのものが多い
      status = roll < 0.45 ? "SUBMITTED" : "DRAFT";
    }

    const quote: SeedQuote = {
      id: `seed-quote-${serial}`,
      number: `Q-${year}-${String(sequence).padStart(4, "0")}`,
      customerId: customer.id,
      assigneeId: employee.id,
      visitArea: customer.area,
      issueDate,
      validUntil: addDays(issueDate, 30),
      status,
      subtotal: calc.subtotal,
      tax: calc.tax,
      total: calc.total,
      notes: random.chance(0.25) ? NOTE_SAMPLES[random.int(0, NOTE_SAMPLES.length - 1)] : "",
      items: calc.items,
    };
    quotes.push(quote);

    if (status === "INVOICED") {
      invoiceDrafts.push({
        quoteId: quote.id,
        customerId: quote.customerId,
        assigneeId: quote.assigneeId,
        issueDate: invoiceDate,
        dueDate: endOfNextMonth(invoiceDate),
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        paidDate: null,
        items: quote.items,
      });
    }
  }

  // デモで「請求書に変換」を試せるよう、受注（まだ請求していない）の見積が3件以上になるようにする
  let orderedCount = quotes.filter((quote) => quote.status === "ORDERED").length;
  for (let i = quotes.length - 1; i >= 0 && orderedCount < 3; i--) {
    if (quotes[i].status !== "INVOICED") continue;
    quotes[i].status = "ORDERED";
    invoiceDrafts.splice(
      invoiceDrafts.findIndex((draft) => draft.quoteId === quotes[i].id),
      1,
    );
    orderedCount++;
  }

  // 請求書：発行日の古い順に番号を付け、入金の状況を決める
  invoiceDrafts.sort((a, b) => a.issueDate.getTime() - b.issueDate.getTime() || a.quoteId.localeCompare(b.quoteId));
  const twoMonthsAgo = utcDate(today.getUTCFullYear(), today.getUTCMonth() - 2, today.getUTCDate());
  const invoiceSequence = new Map<number, number>();

  const invoices: SeedInvoice[] = invoiceDrafts.map((draft, index) => {
    const year = draft.issueDate.getUTCFullYear();
    const sequence = (invoiceSequence.get(year) ?? 0) + 1;
    invoiceSequence.set(year, sequence);

    const age = daysBetween(draft.issueDate, today);
    const daysUntilDue = daysBetween(draft.issueDate, draft.dueDate);
    let paidDate: Date | null = null;

    if (draft.issueDate.getTime() <= twoMonthsAgo.getTime()) {
      // 2か月以上前の請求は、ほぼ入金済み（たまに期限を少し過ぎてから入金）。半年以上前のものはすべて入金済み
      if (age > 180 || random.chance(0.94)) {
        const days = random.chance(0.08) ? daysUntilDue + random.int(1, 10) : random.int(5, daysUntilDue);
        paidDate = addDays(draft.issueDate, Math.min(days, age));
      }
    } else if (draft.dueDate.getTime() < today.getTime()) {
      // 直近の請求のうち、支払期限を過ぎたもの：大半は入金済み
      if (random.chance(0.8)) paidDate = addDays(draft.issueDate, random.int(5, daysUntilDue));
    } else if (age >= 3 && random.chance(Math.min(0.75, age / 50))) {
      // 直近の請求：日がたっているものほど入金済みが多い
      paidDate = addDays(draft.issueDate, random.int(3, age));
    }

    return {
      ...draft,
      id: `seed-invoice-${String(index + 1).padStart(4, "0")}`,
      number: `INV-${year}-${String(sequence).padStart(4, "0")}`,
      paidDate,
    };
  });

  // 「数件は支払期限を過ぎている」ように、期限超過が3〜6件になるよう調整する
  const pastDue = invoices.filter((invoice) => invoice.dueDate.getTime() < today.getTime());
  const overdue = () => pastDue.filter((invoice) => !invoice.paidDate);
  for (let i = pastDue.length - 1; i >= 0 && overdue().length < 3; i--) {
    pastDue[i].paidDate = null;
  }
  for (const invoice of pastDue) {
    if (overdue().length <= 6) break;
    if (!invoice.paidDate) invoice.paidDate = invoice.dueDate;
  }

  const sequences = [
    ...[...quoteSequence].map(([year, value]) => ({ key: `Q-${year}`, value })),
    ...[...invoiceSequence].map(([year, value]) => ({ key: `INV-${year}`, value })),
  ];

  return { quotes, invoices, sequences };
}

/* ---------- データベースへ入れる ---------- */

/** 明細（items）を除いた本体だけを取り出す */
function withoutItems<T extends { items: SeedItem[] }>(row: T): Omit<T, "items"> {
  const copy: Partial<T> = { ...row };
  delete copy.items;
  return copy as Omit<T, "items">;
}

function chunk<T>(rows: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < rows.length; i += size) result.push(rows.slice(i, i + size));
  return result;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL が設定されていません。シードには直結の接続先（DATABASE_URL）が必要です。");
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    // ユーザーが1人でもいれば、何もしない
    if ((await prisma.user.count()) > 0) {
      console.log("シード：すでにデータがあるため、何もしませんでした。");
      return;
    }

    const { quotes, invoices, sequences } = generateDemoData(todayJst());

    const users = await Promise.all(
      [ADMIN, ...EMPLOYEES].map(async (user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      })),
    );

    const inserted = await prisma.$transaction(
      async (tx) => {
        // 同時に2つのビルドが走っても二重に入らないよう、ロックを取ってからもう一度確かめる
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(726001)`;
        if ((await tx.user.count()) > 0) return false;

        await tx.user.createMany({ data: users });
        await tx.customer.createMany({
          data: CUSTOMERS.map(({ id, name, phone, address, area }) => ({ id, name, phone, address, area })),
        });

        for (const rows of chunk(quotes, 500)) {
          await tx.quote.createMany({ data: rows.map(withoutItems) });
        }
        const quoteItems = quotes.flatMap((quote) => quote.items.map((item) => ({ ...item, quoteId: quote.id })));
        for (const rows of chunk(quoteItems, 1000)) {
          await tx.quoteItem.createMany({ data: rows });
        }

        for (const rows of chunk(invoices, 500)) {
          await tx.invoice.createMany({ data: rows.map(withoutItems) });
        }
        const invoiceItems = invoices.flatMap((invoice) =>
          invoice.items.map((item) => ({ ...item, invoiceId: invoice.id })),
        );
        for (const rows of chunk(invoiceItems, 1000)) {
          await tx.invoiceItem.createMany({ data: rows });
        }

        // アプリで次に発行する番号が、デモデータの続きになるようにする
        await tx.numberSequence.createMany({ data: sequences });
        return true;
      },
      { maxWait: 30_000, timeout: 180_000 },
    );

    if (!inserted) {
      console.log("シード：すでにデータがあるため、何もしませんでした。");
      return;
    }

    const paid = invoices.filter((invoice) => invoice.paidDate).length;
    console.log(
      `シード：ユーザー${users.length}人、お客様${CUSTOMERS.length}件、見積${quotes.length}件、請求${invoices.length}件（うち入金済み${paid}件）を入れました。`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

// このファイルを直接実行したときだけデータベースに入れる（テストから読み込んだときは何もしない）
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
