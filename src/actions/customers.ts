"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type CustomerFormValues = { name: string; phone: string; address: string; area: string };
export type CustomerFormState = { error?: string; values?: CustomerFormValues };

function readForm(formData: FormData): CustomerFormValues {
  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    area: String(formData.get("area") ?? ""),
  };
}

function validate(values: CustomerFormValues): string | null {
  if (!values.name) return "お客様名を入れてください。";
  if (values.name.length > 100) return "お客様名は100文字以内にしてください。";
  if (!values.phone) return "電話番号を入れてください。";
  if (values.phone.length > 30) return "電話番号は30文字以内にしてください。";
  if (!values.address) return "住所を入れてください。";
  if (values.address.length > 200) return "住所は200文字以内にしてください。";
  if (values.area !== "IN_CITY" && values.area !== "OUT_OF_CITY") return "市内か市外かを選んでください。";
  return null;
}

/** お客様を保存する（customerId が null なら追加、あれば上書き）。ログインしていれば誰でも使える */
export async function saveCustomer(
  customerId: string | null,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireUser();

  const values = readForm(formData);
  const error = validate(values);
  if (error) return { error, values };

  const data = {
    name: values.name,
    phone: values.phone,
    address: values.address,
    area: values.area as "IN_CITY" | "OUT_OF_CITY",
  };

  if (customerId) {
    const updated = await prisma.customer.updateMany({ where: { id: customerId }, data });
    if (updated.count !== 1) return { error: "このお客様は見つかりませんでした。", values };
  } else {
    await prisma.customer.create({ data });
  }

  revalidatePath("/", "layout");
  redirect("/customers");
}
