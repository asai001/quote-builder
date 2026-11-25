import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * アプリからの接続は「プール経由」の DATABASE_URL_POOLED を使う。
 * （手元で動かすときなど、プール用の接続先が無い場合だけ DATABASE_URL を使う）
 *
 * ここでは接続先を渡すだけで、実際にデータベースへつなぐのは最初の問い合わせのとき。
 * そのため、接続先が無い環境でもビルドは通る。
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
