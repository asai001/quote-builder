import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CustomerForm } from "@/components/customer-form";
import { Card, LoadingBlock, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ResetOnNavigate } from "@/components/reset-on-navigate";

export const metadata: Metadata = { title: "お客様を編集する" };

type Props = { params: Promise<{ id: string }> };

export default function EditCustomerPage({ params }: Props) {
  return (
    <>
      <PageHeader title="お客様を編集する" />
      <Suspense fallback={<LoadingBlock rows={5} />}>
        <EditCustomer params={params} />
      </Suspense>
    </>
  );
}

async function EditCustomer({ params }: Props) {
  const [{ id }] = await Promise.all([params, requireUser()]);
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, address: true, area: true },
  });
  if (!customer) notFound();

  return (
    <Card className="max-w-2xl p-6">
      <ResetOnNavigate>
        <CustomerForm
          customerId={customer.id}
          initial={{ name: customer.name, phone: customer.phone, address: customer.address, area: customer.area }}
        />
      </ResetOnNavigate>
    </Card>
  );
}
