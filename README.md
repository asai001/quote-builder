# 見積・請求かんたん管理

エアコンクリーニング会社（架空）の社内向け「見積・請求・売掛金管理システム」です。
電話で問い合わせを受けた事務員が、エアコンの種類と台数・オプション・訪問先を選ぶだけで、
料金表どおりの見積をその場で出し、受注したらそのまま請求書に変換できます。

## できること

- 見積作成（台数を＋／−で入れると、内訳と合計がすぐに出る）
- 見積の一覧・詳細・状態の変更（下書き → 提出済み → 受注 / 失注 → 請求済み）
- 見積書・請求書の印刷用画面（A4。ブラウザの印刷から PDF にできる）
- 受注した見積を請求書に変換（発行日は今日、支払期限は翌月末）
- 請求の一覧、入金日の登録（管理者のみ）
- 売掛金（未入金）の一覧と合計、期限超過の表示
- ダッシュボード（今月の売上・売掛金残高・期限超過件数・月別売上・社員別売上）
- お客様の一覧・追加・編集

## 技術構成

| 項目 | 内容 |
| --- | --- |
| フレームワーク | Next.js 16（App Router、Cache Components）＋ TypeScript |
| データベース | Prisma Postgres（Prisma ORM 7、`@prisma/adapter-pg`） |
| ログイン | Auth.js（next-auth v5、メールアドレス＋パスワード、bcrypt でハッシュ化） |
| 画面 | Tailwind CSS 4、Recharts |
| 公開 | Vercel（main への push で自動デプロイ、関数は東京 `hnd1`） |

## 主なファイル

| 場所 | 内容 |
| --- | --- |
| `src/config/pricing.ts` | 料金表と計算ルール。画面・保存処理・シードのすべてがここを使う |
| `src/config/company.ts` | 見積書・請求書に載せる発行元の情報（ダミー値） |
| `src/actions/` | 保存・状態変更・請求書への変換・入金登録などのサーバー側の処理（権限チェック込み） |
| `src/lib/session.ts` | ログイン中の人の取得と、見られる範囲（管理者は全件、社員は自分の担当分）の条件 |
| `src/lib/dashboard.ts` | ダッシュボードの集計（データベース側で集計） |
| `src/proxy.ts` | ログインしていない人をログイン画面へ移動させる |
| `prisma/schema.prisma` | データ構造 |
| `prisma/migrations/` | マイグレーション |
| `prisma/seed.ts` | デモ用データ |

## 環境変数

| 名前 | 用途 |
| --- | --- |
| `DATABASE_URL` | 直結の接続先。マイグレーションとシードで使う |
| `DATABASE_URL_POOLED` | プール経由の接続先。アプリからの接続で使う |
| `AUTH_SECRET` | ログイン情報を暗号化する秘密鍵 |

## 公開のしくみ

Vercel はビルド時に `npm run vercel-build` を実行します。

```
prisma migrate deploy  →  prisma db seed  →  next build
```

- マイグレーションとシードは、ビルドのたびに実行されます
- シードは、ユーザーが1人もいないときだけデモデータを入れます（すでにデータがあれば何もしません）
- `next build` そのものはデータベースにつながなくても通ります

## デモ用アカウント

パスワードはすべて `demo1234` です。

| 権限 | メールアドレス |
| --- | --- |
| 管理者 | admin@example.com |
| 社員（佐藤） | sato@example.com |
| 社員（鈴木） | suzuki@example.com |
| 社員（高橋） | takahashi@example.com |
| 社員（田中） | tanaka@example.com |

## 手元で動かす場合

`.env` に上の3つの環境変数を書いたうえで、次を実行します。

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```
