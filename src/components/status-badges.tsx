import type { QuoteStatus } from "@/generated/prisma/enums";
import { PAYMENT_STATUS_LABELS, QUOTE_STATUS_LABELS, type PaymentStatus } from "@/lib/labels";
import { Badge, type BadgeTone } from "./ui";

const QUOTE_TONES: Record<QuoteStatus, BadgeTone> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  ORDERED: "green",
  LOST: "amber",
  INVOICED: "violet",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge tone={QUOTE_TONES[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>;
}

const PAYMENT_TONES: Record<PaymentStatus, BadgeTone> = {
  PAID: "green",
  UNPAID: "gray",
  OVERDUE: "red",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge tone={PAYMENT_TONES[status]}>
      {status === "OVERDUE" ? "⚠ " : ""}
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
