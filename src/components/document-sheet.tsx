import { COMPANY } from "@/config/company";
import { TAX_RATE_PERCENT } from "@/config/pricing";
import { formatDate } from "@/lib/dates";
import { formatNumber, formatYen } from "@/lib/format";

type Item = { id: string; code: string; name: string; quantity: number; unitPrice: number; amount: number };

type Props = {
  kind: "quote" | "invoice";
  number: string;
  issueDate: Date;
  /** 見積：有効期限 ／ 請求：支払期限 */
  secondDate: Date;
  customer: { name: string; address: string };
  assigneeName: string;
  items: Item[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
};

/** A4の見積書・請求書（画面でも印刷でも同じ見た目） */
export function DocumentSheet(props: Props) {
  const isInvoice = props.kind === "invoice";
  const title = isInvoice ? "請求書" : "御見積書";
  // 明細が少ないときも表の形がくずれないよう、空の行で10行までうめる
  const blankRows = Math.max(0, 10 - props.items.length);

  return (
    <article className="print-sheet">
      <h1 className="text-center text-[22pt] font-bold tracking-[0.4em]">{title}</h1>

      <div className="mt-8 flex justify-between gap-8">
        <div className="min-w-0 flex-1">
          <p className="border-b-2 border-black pb-1 text-[15pt] font-bold">{props.customer.name}　様</p>
          <p className="mt-2 text-[9.5pt]">{props.customer.address}</p>
          <p className="mt-6">
            {isInvoice ? "下記のとおり、ご請求申し上げます。" : "下記のとおり、お見積り申し上げます。"}
          </p>
          <div className="mt-3 flex items-baseline justify-between border-2 border-black px-4 py-2">
            <span className="text-[11pt] font-bold">{isInvoice ? "ご請求金額（税込）" : "お見積金額（税込）"}</span>
            <span className="tabular text-[18pt] font-bold">{formatYen(props.total)}</span>
          </div>
        </div>

        <div className="w-[72mm] shrink-0 text-[9.5pt]">
          <table className="mb-4 w-full">
            <tbody>
              <tr>
                <th className="pr-2 text-left font-normal">{isInvoice ? "請求番号" : "見積番号"}</th>
                <td className="tabular text-right">{props.number}</td>
              </tr>
              <tr>
                <th className="pr-2 text-left font-normal">発行日</th>
                <td className="tabular text-right">{formatDate(props.issueDate)}</td>
              </tr>
              <tr>
                <th className="pr-2 text-left font-normal">{isInvoice ? "お支払期限" : "有効期限"}</th>
                <td className="tabular text-right">{formatDate(props.secondDate)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11pt] font-bold">{COMPANY.name}</p>
          <p>〒{COMPANY.postalCode}</p>
          <p>{COMPANY.address}</p>
          <p className="tabular">電話：{COMPANY.phone}</p>
          {isInvoice ? <p className="tabular">登録番号：{COMPANY.invoiceRegistrationNumber}</p> : null}
          <p>担当：{props.assigneeName}</p>
        </div>
      </div>

      <table className="mt-8 w-full border-collapse text-[10pt]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-black px-2 py-1.5 text-left">品名</th>
            <th className="w-[20mm] border border-black px-2 py-1.5 text-right">数量</th>
            <th className="w-[28mm] border border-black px-2 py-1.5 text-right">単価</th>
            <th className="w-[32mm] border border-black px-2 py-1.5 text-right">金額</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id}>
              <td className="border border-black px-2 py-1.5">{item.name}</td>
              <td className="tabular border border-black px-2 py-1.5 text-right">
                {item.code.startsWith("travel_") ? "1回" : `${item.quantity}台`}
              </td>
              <td className="tabular border border-black px-2 py-1.5 text-right">{formatNumber(item.unitPrice)}</td>
              <td className="tabular border border-black px-2 py-1.5 text-right">{formatNumber(item.amount)}</td>
            </tr>
          ))}
          {Array.from({ length: blankRows }, (_, index) => (
            <tr key={`blank-${index}`}>
              <td className="border border-black px-2 py-1.5">&nbsp;</td>
              <td className="border border-black px-2 py-1.5" />
              <td className="border border-black px-2 py-1.5" />
              <td className="border border-black px-2 py-1.5" />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-0 flex justify-end">
        <table className="w-[80mm] border-collapse text-[10pt]">
          <tbody>
            <tr>
              <th className="border border-t-0 border-black bg-slate-100 px-2 py-1.5 text-left font-normal">
                小計（{TAX_RATE_PERCENT}%対象・税抜）
              </th>
              <td className="tabular w-[32mm] border border-t-0 border-black px-2 py-1.5 text-right">
                {formatNumber(props.subtotal)}
              </td>
            </tr>
            <tr>
              <th className="border border-black bg-slate-100 px-2 py-1.5 text-left font-normal">
                消費税（{TAX_RATE_PERCENT}%）
              </th>
              <td className="tabular border border-black px-2 py-1.5 text-right">{formatNumber(props.tax)}</td>
            </tr>
            <tr>
              <th className="border border-black bg-slate-100 px-2 py-1.5 text-left">合計（税込）</th>
              <td className="tabular border border-black px-2 py-1.5 text-right text-[12pt] font-bold">
                {formatYen(props.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {isInvoice ? (
        <section className="mt-8 text-[10pt]">
          <h2 className="border-b border-black pb-0.5 font-bold">お振込先</h2>
          <p className="mt-1.5">{COMPANY.bankAccount}</p>
          <p className="mt-1 text-[9pt]">
            お支払期限（{formatDate(props.secondDate)}
            ）までにお振込みください。恐れ入りますが、振込手数料はお客様のご負担でお願いいたします。
          </p>
        </section>
      ) : null}

      {props.notes || !isInvoice ? (
        <section className="mt-8 text-[10pt]">
          <h2 className="border-b border-black pb-0.5 font-bold">備考</h2>
          {props.notes ? <p className="mt-1.5 whitespace-pre-wrap">{props.notes}</p> : null}
          {!isInvoice ? (
            <p className="mt-1.5 text-[9pt]">
              このお見積りの有効期限は {formatDate(props.secondDate)}{" "}
              までです。エアコンの台数が2台以上の場合は、2台目以降の割引を適用しています。
            </p>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
