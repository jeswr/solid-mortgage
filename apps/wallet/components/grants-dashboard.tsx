"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ClientGrantOptions,
  changeDemoGrant,
  demoParties,
  readDemoStandings,
} from "@/lib/grants/client";
import type { GrantStanding } from "@/lib/grants/engine";
import { PodAccessError } from "@/lib/grants/engine";
import { useVault } from "@/lib/pod/vault-context";
import type { GrantPartyId } from "@/lib/server/config";

interface PartyRow {
  readonly id: GrantPartyId;
  readonly label: string;
  readonly webid: string;
  readonly standing?: GrantStanding;
}

export function GrantsDashboard() {
  const vault = useVault();
  const [standings, setStandings] = useState<readonly GrantStanding[] | undefined>();
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
    setStandings(await readDemoStandings(grantOptions));
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
    try {
      await changeDemoGrant(party.id, action, grantOptions);
      setNotice(
        action === "grant"
          ? `Access granted to the ${party.label}. Receipt written to Consent receipts.`
          : `Access revoked from the ${party.label}. Receipt written to Consent receipts.`,
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

  const rows: PartyRow[] = demoParties().map((party) => ({
    ...party,
    standing: standings?.find((entry) => entry.agent === party.webid),
  }));

  return (
    <section aria-labelledby="grants-heading" className="mt-8" data-grants-dashboard="">
      <h2 className="sr-only" id="grants-heading">
        Organisations
      </h2>
      {notice !== undefined && (
        <p
          aria-live="polite"
          className="rounded-md border border-border bg-card p-3 text-sm"
          data-grants-notice=""
        >
          {notice}
        </p>
      )}
      <ul className="mt-4 grid list-none gap-3 p-0">
        {rows.map((row) => {
          const granted = row.standing?.granted === true;
          const revoked = row.standing?.revoked === true;
          return (
            <li
              className="rounded-lg border border-border bg-card p-4"
              data-grant-party={row.id}
              data-grant-state={granted ? "granted" : revoked ? "revoked" : "none"}
              key={row.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-card-foreground text-sm">{row.label}</p>
                  <p className="mt-1 text-muted-foreground text-xs" data-grant-status-line="">
                    Loan file:{" "}
                    {granted
                      ? (row.standing?.modes ?? []).join(", ")
                      : revoked
                        ? "access revoked. It cannot be silently re-granted."
                        : "no access"}
                  </p>
                  <details className="mt-1 text-muted-foreground text-xs">
                    <summary className="cursor-pointer">Technical details</summary>
                    <p className="mt-1 break-all">Service identity (WebID): {row.webid}</p>
                  </details>
                </div>
                <div className="flex gap-2">
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
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-muted-foreground text-xs">
        Closing-record access is granted in the Closing app. It appears in Consent receipts.
      </p>
    </section>
  );
}
