/**
 * 見積書・請求書に載せる発行元の情報。
 * ※ すべてダミーの値です。実際に使うときは自社の情報に書き換えてください。
 */
export const COMPANY = {
  name: "株式会社サンプルエアコンクリーニング",
  postalCode: "000-0000",
  address: "青葉市中央町1丁目2番3号 サンプルビル2階",
  phone: "000-000-0000",
  email: "info@sample-aircon.example",
  /** 適格請求書発行事業者の登録番号（インボイス登録番号） */
  invoiceRegistrationNumber: "T0000000000000",
  /** 請求書に載せる振込先 */
  bankAccount: "みほん銀行（ダミー） 青葉支店 普通 0000000 カ）サンプルエアコンクリーニング",
} as const;

/** 画面の左上などに出すシステム名 */
export const APP_NAME = "見積・請求かんたん管理";
