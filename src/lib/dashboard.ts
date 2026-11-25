import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { addMonthsToMonthStart, startOfMonth, toDateInputValue, todayJst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { isAdmin, type CurrentUser } from "@/lib/session";

export type MonthlySales = { month: string; label: string; sales: number };
export type EmployeeSales = { id: string; name: string; monthSales: number; yearSales: number };

export type DashboardData = {
  /** 今月の売上（税抜） */
  thisMonthSales: number;
  thisMonthLabel: string;
  /** 売掛金残高（未入金の請求の合計・税込） */
  receivableBalance: number;
  unpaidCount: number;
  /** 支払期限を過ぎた未入金の件数 */
  overdueCount: number;
  /** 直近12か月の月別売上（古い月 → 今月） */
  monthly: MonthlySales[];
  /** 社員別の売上（管理者のときだけ。社員のときは null） */
  byEmployee: EmployeeSales[] | null;
};

/**
 * ダッシュボードの数字をまとめて取る。
 *
 * - 売上は「請求書の発行日」を基準にした税抜金額（Invoice.subtotal）
 * - 集計はすべてデータベース側（SUM / COUNT / GROUP BY）で行い、請求を全件取ってきて計算することはしない
 * - 問い合わせは最大3本で、同時に実行する
 * - 社員は自分が担当の請求だけを集計する
 */
export async function getDashboardData(user: CurrentUser): Promise<DashboardData> {
  const today = todayJst();
  const monthStart = startOfMonth(today);
  const rangeStart = addMonthsToMonthStart(today, -11);
  const rangeEnd = addMonthsToMonthStart(today, 1);

  const todayText = toDateInputValue(today);
  const monthStartText = toDateInputValue(monthStart);
  const rangeStartText = toDateInputValue(rangeStart);
  const rangeEndText = toDateInputValue(rangeEnd);

  const admin = isAdmin(user);
  const onlyMine = admin ? Prisma.empty : Prisma.sql`AND "assigneeId" = ${user.id}`;

  const monthlyQuery = prisma.$queryRaw<{ month: string; sales: bigint }[]>`
    SELECT to_char(date_trunc('month', "issueDate"), 'YYYY-MM') AS "month",
           SUM("subtotal") AS "sales"
    FROM "Invoice"
    WHERE "issueDate" >= ${rangeStartText}::date
      AND "issueDate" < ${rangeEndText}::date
      ${onlyMine}
    GROUP BY 1
    ORDER BY 1
  `;

  const receivableQuery = prisma.$queryRaw<{ balance: bigint; unpaid: bigint; overdue: bigint }[]>`
    SELECT COALESCE(SUM("total"), 0) AS "balance",
           COUNT(*) AS "unpaid",
           COUNT(*) FILTER (WHERE "dueDate" < ${todayText}::date) AS "overdue"
    FROM "Invoice"
    WHERE "paidDate" IS NULL
      ${onlyMine}
  `;

  const employeeQuery = admin
    ? prisma.$queryRaw<{ id: string; name: string; monthSales: bigint; yearSales: bigint }[]>`
        SELECT u."id",
               u."name",
               COALESCE(SUM(i."subtotal") FILTER (WHERE i."issueDate" >= ${monthStartText}::date), 0) AS "monthSales",
               COALESCE(SUM(i."subtotal"), 0) AS "yearSales"
        FROM "User" u
        LEFT JOIN "Invoice" i
          ON i."assigneeId" = u."id"
         AND i."issueDate" >= ${rangeStartText}::date
         AND i."issueDate" < ${rangeEndText}::date
        GROUP BY u."id", u."name", u."role"
        HAVING u."role" = 'EMPLOYEE' OR COUNT(i."id") > 0
        ORDER BY "yearSales" DESC, u."name" ASC
      `
    : Promise.resolve(null);

  const [monthlyRows, receivableRows, employeeRows] = await Promise.all([monthlyQuery, receivableQuery, employeeQuery]);

  // 売上が無かった月も 0円 として並べる
  const salesByMonth = new Map(monthlyRows.map((row) => [row.month, Number(row.sales)]));
  const monthly: MonthlySales[] = [];
  for (let offset = -11; offset <= 0; offset++) {
    const date = addMonthsToMonthStart(today, offset);
    const key = toDateInputValue(date).slice(0, 7);
    monthly.push({
      month: key,
      label: `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月`,
      sales: salesByMonth.get(key) ?? 0,
    });
  }

  const receivable = receivableRows[0];

  return {
    thisMonthSales: monthly[monthly.length - 1].sales,
    thisMonthLabel: `${today.getUTCFullYear()}年${today.getUTCMonth() + 1}月`,
    receivableBalance: Number(receivable?.balance ?? 0),
    unpaidCount: Number(receivable?.unpaid ?? 0),
    overdueCount: Number(receivable?.overdue ?? 0),
    monthly,
    byEmployee: employeeRows
      ? employeeRows.map((row) => ({
          id: row.id,
          name: row.name,
          monthSales: Number(row.monthSales),
          yearSales: Number(row.yearSales),
        }))
      : null,
  };
}
