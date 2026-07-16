import type { Metadata } from "next";
import { FlowPage } from "@/components/flow-page";

export const metadata: Metadata = {
  title: "Asset verification — Concept Demo (not Finicity)",
};

export default function AssetsFlowPage() {
  return <FlowPage flow="assets" />;
}
