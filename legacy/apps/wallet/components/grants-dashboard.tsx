"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ClientGrantOptions,
  changeDemoGrant,
  type DemoParty,
  demoParties,
  readDemoLedger,
  readDemoStandings,
} from "@/lib/grants/client";
import type { ConsentReceiptView, GrantStanding } from "@/lib/grants/engine";
import { PodAccessError } from "@/lib/grants/engine";
import { useVault } from "@/lib/pod/vault-context";
import type { GrantPartyId } from "@/lib/server/config";
import { describeModes, shortPartyLabel } from "./party-labels";

/** Exact local-mode sentence (round-2 label contract), kept beside the controls. */
const LOCAL_MODE_NOTE =
  "Permission changes are saved. This local demo makes requests as Alex; it does not enforce separate organisation permissions.";

/** Parties the eClosing app grants closing-record access to (scene 5). */
const CLOSING_RECORD_PARTIES: ReadonlySet<GrantPartyId> = new Set(["lender-boa", "servicer"]);

const CLOSING_ACCESS_HREF = "/closing#closing-access";

interface PartyRow extends DemoParty {
  readonly standing?: GrantStanding;
  /** Latest closing-record consent record for this party, if any. */
  readonly closing?: ConsentReceiptView;
}

function isClosingRecord(resource: string): boolean {
  return /\/closing-record$/.test(resource);
}

/** Latest closing-record receipt per recipient WebID. */
function latestClosingReceipts(
  ledger: readonly ConsentReceiptView[],
): ReadonlyMap<string, ConsentReceiptView> {
  const latest = new Map<string, ConsentReceiptView>();
  for (const receipt of ledger) {
    if (!isClosingRecord(receipt.resource)) continue;
    const previous = latest.get(receipt.recipient);
    if (previous === undefined || previous.issuedAt <= receipt.issuedAt) {
      latest.set(receipt.recipient, receipt);
    }
  }
  return latest;
}

/**
 * The last closing-record change recorded in a consent receipt. It is history,
 * not the closing record's current permission list, and the receipt's writer
 * is not verified (astra-review-3 new finding 1).
 */
function closingLastChange(receipt: ConsentReceiptView | undefined, failed: boolean): string {
  if (failed) return "Could not load closing-record access history.";
  if (receipt === undefined) return "None recorded in this pod.";
  return receipt.action === "grant"
    ? "Read access granted — receipt source unverified."
    : "Access removed — receipt source unverified.";
}

/**
 * The access inventory (astra-review-2 M8/finding 13): one card per organisation with
 * separate Organisation / Data / Permission rows for the loan file and, where the eClosing
 * app manages it, the closing record.
 */
export function GrantsDashboard() {
  const vault = useVault();
  const [standings, setStandings] = useState<readonly GrantStanding[] | undefined>();
  const [ledger, setLedger] = useState<readonly ConsentReceiptView[]>([]);
  const [ledgerFailed, setLedgerFailed] = useState(false);
  const [notice, setNotice] = useState<string | undefined>();
  const [busy, setBusy] = useState<string | undefined>();

  const options = useCallback((): ClientGrantOptions | undefined => {
    if (vault.status !== "ready") return undefined;
    return {
      podFetch: vault.connection.session.authFetch,
      podBase: vault.connection.podBaseUrl.endsWith("/")
        ? vault.connection.podBaseUrl
        : `${vault.connection.podBaseUrl}/`,
      webId: vault.connection.webId,
    };
  }, [vault]);

  const refresh = useCallback(async () => {
    const grantOptions = options();
    if (grantOptions === undefined) return;
    const [nextStandings, nextLedger] = await Promise.all([
      readDemoStandings(grantOptions),
      // The closing-record rows are display-only: a ledger read failure must not
      // hide the loan-file controls.
      readDemoLedger(grantOptions).catch(() => undefined),
    ]);
    setStandings(nextStandings);
    setLedger(nextLedger ?? []);
    setLedgerFailed(nextLedger === undefined);
  }, [options]);

  useEffect(() => {
    refresh().catch((error: unknown) =>
      setNotice(error instanceof Error ? error.message : String(error)),
    );
  }, [refresh]);

  async function change(party: PartyRow, action: "grant" | "revoke"): Promise<void> {
    const grantOptions = options();
    if (grantOptions === undefined) return;
    setBusy(party.id);
    setNotice(undefined);
    const name = shortPartyLabel(party.label).toLowerCase();
    try {
      await changeDemoGrant(party.id, action, grantOptions);
      setNotice(
        action === "grant"
          ? `Loan-file access granted to the ${name}. Receipt written to Consent receipts.`
          : `Loan-file access revoked from the ${name}. Receipt written to Consent receipts.`,
      );
    } catch (error) {
      // 409s are the engine SPEAKING (immutability, repeats) — show verbatim.
      setNotice(
        error instanceof PodAccessError
          ? error.message
          : `The pod refused the change: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(undefined);
      await refresh().catch(() => {});
    }
  }

  if (vault.status === "booting") {
    return <p className="mt-6 text-sm text-muted-foreground">Starting the demo pod…</p>;
  }
  if (vault.status === "error") {
    return (
      <p className="mt-6 text-sm text-muted-foreground" role="alert">
        The demo pod is unavailable: {vault.message}
      </p>
    );
  }

  const closingByRecipient = latestClosingReceipts(ledger);
  const parties = demoParties();
  const known = new Set(parties.map((party) => party.webid));
  const rows: PartyRow[] = parties.map((party) => ({
    ...party,
    standing: standings?.find((entry) => entry.agent === party.webid),
    closing: closingByRecipient.get(party.webid),
  }));
  const otherClosing = [...closingByRecipient.values()].filter(
    (receipt) => !known.has(receipt.recipient),
  );
  const rowGrid = "grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[7rem_1fr]";

  return (
    <section aria-labelledby="grants-heading" className="mt-8" data-grants-dashboard="">
      <h2 className="font-semibold text-foreground text-xl" id="grants-heading">
        Access inventory
      </h2>
      <p
        className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950 text-sm"
        data-grants-local-mode=""
      >
        {LOCAL_MODE_NOTE}
      </p>
      {notice !== undefined && (
        <p
          aria-live="polite"
          className="mt-3 rounded-md border border-border bg-card p-3 text-sm"
          data-grants-notice=""
        >
          {notice}
        </p>
      )}
      <ul className="mt-4 grid list-none gap-3 p-0">
        {rows.map((row) => {
          const granted = row.standing?.granted === true;
          const revoked = row.standing?.revoked === true;
          const showClosing = CLOSING_RECORD_PARTIES.has(row.id) || row.closing !== undefined;
          return (
            <li
              className="rounded-lg border border-border bg-card p-4"
              data-grant-party={row.id}
              data-grant-state={granted ? "granted" : revoked ? "revoked" : "none"}
              key={row.id}
            >
              <dl className={rowGrid}>
                <dt className="font-medium text-muted-foreground">Organisation</dt>
                <dd className="m-0 font-semibold text-card-foreground">{row.label}</dd>
              </dl>
              <div className="mt-3 border-border border-t pt-3" data-grant-scope="loan-file">
                <dl className={rowGrid}>
                  <dt className="font-medium text-muted-foreground">Data</dt>
                  <dd className="m-0 text-card-foreground">Loan file</dd>
                  <dt className="font-medium text-muted-foreground">Permission</dt>
                  <dd className="m-0 text-card-foreground" data-grant-status-line="">
                    {granted
                      ? describeModes(row.standing?.modes ?? [])
                      : revoked
                        ? "Access revoked. It cannot be silently re-granted."
                        : "No access"}
                  </dd>
                </dl>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm disabled:opacity-50"
                    data-grant-action={`grant-${row.id}`}
                    disabled={busy !== undefined || granted || revoked}
                    onClick={() => void change(row, "grant")}
                    type="button"
                  >
                    Grant access
                  </button>
                  <button
                    className="rounded-md border border-border px-3 py-1.5 font-medium text-sm disabled:opacity-50"
                    data-grant-action={`revoke-${row.id}`}
                    disabled={busy !== undefined || !granted}
                    onClick={() => void change(row, "revoke")}
                    type="button"
                  >
                    Revoke access
                  </button>
                </div>
              </div>
              {showClosing && (
                <div className="mt-3 border-border border-t pt-3" data-grant-scope="closing-record">
                  <dl className={rowGrid}>
                    <dt className="font-medium text-muted-foreground">Data</dt>
                    <dd className="m-0 text-card-foreground">Closing record</dd>
                    <dt className="font-medium text-muted-foreground">Last recorded change</dt>
                    <dd className="m-0 text-card-foreground" data-grant-closing-status="">
                      {closingLastChange(row.closing, ledgerFailed)}{" "}
                      <a className="underline" href={CLOSING_ACCESS_HREF}>
                        Manage in the eClosing app
                      </a>
                    </dd>
                  </dl>
                </div>
              )}
              <details className="mt-3 text-muted-foreground text-xs">
                <summary className="cursor-pointer">Technical details</summary>
                <p className="mt-1 break-all">Service identity (WebID): {row.webid}</p>
              </details>
            </li>
          );
        })}
        {otherClosing.map((receipt) => (
          <li
            className="rounded-lg border border-border bg-card p-4"
            data-grant-other=""
            key={receipt.recipient}
          >
            <dl className={rowGrid}>
              <dt className="font-medium text-muted-foreground">Organisation</dt>
              <dd className="m-0 font-semibold text-card-foreground">
                Organisation named by the eClosing app
              </dd>
              <dt className="font-medium text-muted-foreground">Data</dt>
              <dd className="m-0 text-card-foreground">Closing record</dd>
              <dt className="font-medium text-muted-foreground">Last recorded change</dt>
              <dd className="m-0 text-card-foreground">{closingLastChange(receipt, false)}</dd>
            </dl>
            <details className="mt-3 text-muted-foreground text-xs">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-all">Service identity (WebID): {receipt.recipient}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
