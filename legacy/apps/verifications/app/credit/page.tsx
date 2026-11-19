import type { Metadata } from "next";
import { FlowPage } from "@/components/flow-page";

export const metadata: Metadata = {
  title: "Credit-score verification — Concept Demo (not Equifax)",
};

export default function CreditFlowPage() {
  return <FlowPage flow="credit" />;
}
