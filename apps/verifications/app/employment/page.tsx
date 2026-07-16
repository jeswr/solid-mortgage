import type { Metadata } from "next";
import { FlowPage } from "@/components/flow-page";

export const metadata: Metadata = {
  title: "Employment + income verification — Concept Demo (not The Work Number)",
};

export default function EmploymentFlowPage() {
  return <FlowPage flow="employment" />;
}
