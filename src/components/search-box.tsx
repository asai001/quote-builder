import Form from "next/form";
import { buttonClass, inputClass } from "./ui";

/** 一覧のさがす欄（入力して「さがす」を押すと、条件付きで一覧を開き直す） */
export function SearchBox({
  action,
  defaultValue,
  placeholder,
  hidden = {},
}: {
  action: string;
  defaultValue: string;
  placeholder: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <Form action={action} role="search" className="flex w-full max-w-md items-center gap-2">
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={50}
        className={inputClass}
      />
      <button type="submit" className={buttonClass("secondary", "md", "shrink-0")}>
        さがす
      </button>
    </Form>
  );
}
