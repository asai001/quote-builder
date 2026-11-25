import { TAX_RATE_PERCENT } from "@/config/pricing";
import { formatNumber, formatYen } from "@/lib/format";

type Item = { id: string; code: string; name: string; quantity: number; unitPrice: number; amount: number };

/** 明細と金額（見積・請求の詳細画面で共通） */
export function ItemsTable({
  items,
  subtotal,
  tax,
  total,
}: {
  items: Item[];
  subtotal: number;
  tax: number;
  total: number;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-600">
              <th scope="col" className="px-4 py-3 text-left font-bold">
                品名
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold">
                数量
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold">
                単価
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold">
                金額
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                <td className="tabular whitespace-nowrap px-4 py-3 text-right">
                  {item.code.startsWith("travel_") ? "1回" : `${item.quantity}台`}
                </td>
                <td className="tabular whitespace-nowrap px-4 py-3 text-right">{formatNumber(item.unitPrice)}円</td>
                <td
                  className={`tabular whitespace-nowrap px-4 py-3 text-right font-bold ${item.amount < 0 ? "text-red-700" : ""}`}
                >
                  {formatYen(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto mt-4 w-full max-w-sm space-y-2 px-4 pb-2">
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-700">小計（税抜）</dt>
          <dd className="tabular font-bold">{formatYen(subtotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-700">消費税（{TAX_RATE_PERCENT}%）</dt>
          <dd className="tabular font-bold">{formatYen(tax)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t-2 border-slate-800 pt-2">
          <dt className="text-lg font-bold">合計（税込）</dt>
          <dd className="tabular text-3xl font-bold text-slate-900">{formatYen(total)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** 「項目名：内容」の並び */
export function InfoList({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-sm font-bold text-slate-500">{row.label}</dt>
          <dd className="mt-0.5 text-lg text-slate-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
