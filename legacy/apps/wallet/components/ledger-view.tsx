"use client";

import { ReceiptCard } from "@mortgage/ui";
import { useEffect, useState } from "react";
import { readDemoLedger } from "@/lib/grants/client";
import type { ConsentReceiptView } from "@/lib/grants/engine";
import { useVault } from "@/lib/pod/vault-context";
import { grantedAccessPhrase, partyForWebId, shortPartyLabel } from "./party-labels";

/** The app that writes the closing-record consent receipts (apps/closing). */
const CLOSING_PLATFORM = "Closing platform (Digital Closing and Servicing Transfer)";

export function LedgerView() {
  const vault = useVault();
  const [receipts, setReceipts] = useState<readonly ConsentReceiptView[] | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (vault.status !== "ready") return;
    let cancelled = false;
    readDemoLedger({
      podFetch: vault.connection.session.authFetch,
      podBase: vault.connection.podBaseUrl.endsWith("/")
        ? vault.connection.podBaseUrl
        : `${vault.connection.podBaseUrl}/`,
      webId: vault.connection.webId,
    }).then(
      (result) => {
        if (!cancelled) setReceipts(result);
      },
      (cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [vault]);

  if (vault.status === "error") {
    return (
      <p className="mt-6 text-sm text-muted-foreground" role="alert">
        The demo pod is unavailable: {vault.message}
      </p>
    );
  }
  if (error !== undefined) {
    return (
      <p className="mt-6 text-sm text-muted-foreground" role="alert">
        Could not read the consent receipts: {error}
      </p>
    );
  }
  if (vault.status === "booting" || receipts === undefined) {
    return (
      <p className="mt-6 text-sm text-muted-foreground" data-ledger-loading="">
        Reading consent receipts…
      </p>
    );
  }
  if (receipts.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-border bg-card p-4 text-sm" data-ledger-empty="">
        No consent receipts yet. Grant access on the Access permissions page to create one.
      </p>
    );
  }
  return (
    <div className="mt-6 grid gap-3" data-ledger-list="">
      {receipts.map((receipt) => {
        const party = partyForWebId(receipt.recipient);
        const external = receipt.provenance === "external";
        return (
          <div data-receipt-provenance={receipt.provenance} key={receipt.iri}>
            <ReceiptCard
              accessLabel={
                party !== undefined && !external
                  ? `${grantedAccessPhrase(party.id)} access`
                  : "access"
              }
              action={receipt.action}
              actor={receipt.actor}
              iri={receipt.iri}
              issuedAt={receipt.issuedAt}
              organisationLabel={party === undefined ? undefined : shortPartyLabel(party.label)}
              recipient={receipt.recipient}
              // Wallet records come from Data Vault's protected store. The only
              // app that writes root-level consent receipts in the mortgage folder
              // is the closing platform; the card still marks the source unverified.
              recordedBy={external ? CLOSING_PLATFORM : "Data Vault"}
              resource={receipt.resource}
              unverifiedSource={external}
            />
          </div>
        );
      })}
    </div>
  );
}
