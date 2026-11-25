import type { Metadata } from "next";
import { CustomerForm } from "@/components/customer-form";
import { Card, PageHeader } from "@/components/ui";
import { ResetOnNavigate } from "@/components/reset-on-navigate";

export const metadata: Metadata = { title: "お客様を追加する" };

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="お客様を追加する" />
      <Card className="max-w-2xl p-6">
        <ResetOnNavigate>
          <CustomerForm customerId={null} initial={{ name: "", phone: "", address: "", area: "IN_CITY" }} />
        </ResetOnNavigate>
      </Card>
    </>
  );
}
