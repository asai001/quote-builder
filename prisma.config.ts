import "dotenv/config";
import { defineConfig } from "prisma/config";

// マイグレーションとシードは「直結」の DATABASE_URL を使う。
// （アプリ本体は src/lib/prisma.ts で「プール経由」の DATABASE_URL_POOLED を使う）
// env() ではなく process.env を直接読むのは、データベースの接続先が無い環境
// （この作業環境など）でも prisma generate が通るようにするため。
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
