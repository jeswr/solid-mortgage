"use client";

import { useState } from "react";
import { demoPersona, zkThresholds } from "@/app/content/persona";

interface CopyRowProps {
  label: string;
  value: string;
  note?: string;
}

function CopyRow({ label, value, note }: CopyRowProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions/insecure context): the value stays selectable.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-border border-b py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate font-medium text-card-foreground text-sm tabular-nums">{value}</p>
        {note !== undefined && <p className="text-muted-foreground text-xs">{note}</p>}
      </div>
      <button
        className="shrink-0 rounded-md border border-border px-2.5 py-1 text-muted-foreground text-xs hover:bg-muted"
        onClick={() => void copy()}
        type="button"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/**
 * Copy-ready demo identity (showcase-patterns §1): the scripted persona's values, one
 * click from the presenter's clipboard, pinned to the decision-0005 ZK thresholds so the
 * scene-2 statements always hold.
 */
export function DemoIdentityCard() {
  const income = demoPersona.monthlyGrossIncomeUsd;
  const dtiBound = Math.floor(zkThresholds.dtiRatioMax * income);
  return (
    <div className="rounded-xl border border-border bg-card p-5" data-demo-identity-card="">
      <h3 className="font-semibold text-card-foreground">Demo identity — {demoPersona.name}</h3>
      <p className="mt-1 text-muted-foreground text-sm">{demoPersona.descriptor}</p>
      <div className="mt-3">
        <CopyRow label="Name" value={demoPersona.name} />
        <CopyRow
          label="Monthly gross income"
          note={`Proves income ≥ $${zkThresholds.monthlyIncomeMinUsd.toLocaleString("en-US")}/mo in scene 2`}
          value={`$${income.toLocaleString("en-US")}/mo`}
        />
        <CopyRow
          label="Credit score"
          note={`Proves score ≥ ${zkThresholds.creditScoreMin} in scene 2`}
          value={String(demoPersona.creditScore)}
        />
        <CopyRow
          label="Monthly debts"
          note={`Within the DTI bound (≤ $${dtiBound.toLocaleString("en-US")}/mo)`}
          value={`$${demoPersona.monthlyDebtsUsd.toLocaleString("en-US")}/mo`}
        />
        <CopyRow
          label="Verified assets"
          value={`$${demoPersona.verifiedAssetsUsd.toLocaleString("en-US")}`}
        />
        <CopyRow label="Employer" value={demoPersona.employer} />
      </div>
      <p className="mt-3 text-muted-foreground text-xs">
        Fictional persona; every value is simulated. In the default visitor mode, pods run in your
        own browser and sign-in is simulated — the on-screen honesty panels say so.
      </p>
    </div>
  );
}
