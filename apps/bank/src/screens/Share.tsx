// AUTHORED-BY Claude Opus 5.5
import { shareAssets } from "@mortgage/content/mortgage/journey";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ErrorNote, FigureTag, IssuedCard } from "../components.tsx";
import { loadIssuances } from "../data.ts";
import { org } from "../org.ts";
import { usePodData, usePods } from "../pods.tsx";
import { averageBalance, largeDeposits, ledger, money } from "../view.ts";
import { ACCOUNT_LIST } from "./Accounts.tsx";

/** Tour step 3: Alex asks Alder Bank for a signed account summary in the pod. */
export function Share() {
  useEffect(() => applyDocumentMeta(org, "Share a verified account summary"), []);
  const pods = usePods();
  const issued = usePodData((p) => loadIssuances(p.world()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const summary =
    issued.state === "ready"
      ? issued.data.find((issuance) => issuance.name === "assets")
      : undefined;
  const calendar = pods?.world().calendar;
  const flagged =
    calendar === undefined
      ? undefined
      : ACCOUNT_LIST.flatMap((account) => largeDeposits(ledger(calendar, account)));

  return (
    <div className="page narrow">
      <p className="crumbs">
        <Link href="/">Accounts</Link> <span aria-hidden="true">›</span> Share
      </p>
      <h1>Share a verified account summary</h1>
      <p className="lede">
        Alder Bank signs a summary of your accounts and writes it into your pod. A lender can check
        our signature without calling us.
      </p>

      <section className="panel" aria-labelledby="signed-heading">
        <h2 id="signed-heading">What we sign</h2>
        <table className="summary">
          <caption className="sr-only">Accounts in the summary</caption>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col" className="num">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {ACCOUNT_LIST.map((account) => (
              <tr key={account.last4}>
                <th scope="row">
                  Alder Bank ··{account.last4}
                  <span className="sub">{account.name}</span>
                </th>
                <td className="num">{money(account.balanceUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <FigureTag />
        <p className="small">Valid for 120 days. Last four digits only, never the full number.</p>
      </section>

      <section className="panel muted" aria-labelledby="kept-heading">
        <h2 id="kept-heading">What stays with Alder Bank</h2>
        <ul className="panel-list">
          <li>Your transactions and statements</li>
          <li>Full account numbers</li>
          <li>
            Your 60-day average balances
            {calendar === undefined
              ? ""
              : ` (${ACCOUNT_LIST.map((account) => money(averageBalance(calendar, account))).join(" and ")})`}
          </li>
          <li>
            Our large-deposit review:{" "}
            {flagged === undefined
              ? "…"
              : flagged.length === 0
                ? "no large deposits in the last 60 days"
                : `${flagged.length} to explain`}
          </li>
        </ul>
      </section>

      <section className="panel send" aria-labelledby="send-heading">
        <h2 id="send-heading">Send it to your pod</h2>
        <p>
          We ask your wallet for one slot, credentials/assets (grant G2). When you approve, we can
          write that one slot and nothing else.
        </p>
        <button
          type="button"
          className="primary"
          data-tour="bank-send"
          disabled={pods === null || busy || issued.state !== "ready" || summary !== undefined}
          onClick={async () => {
            if (pods === null) return;
            setBusy(true);
            setError(undefined);
            try {
              await pods.runBeat(shareAssets);
            } catch (caught) {
              setError(caught);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Sending…" : summary !== undefined ? "Sent" : "Send"}
        </button>
        {error === undefined ? null : <ErrorNote error={error} />}
      </section>

      {summary === undefined ? null : (
        <section className="receipt" aria-labelledby="receipt-heading">
          <h2 id="receipt-heading">Sent to your pod</h2>
          <p className="small">Read from our own issued/ record and status list.</p>
          <IssuedCard issuance={summary} />
        </section>
      )}
      {issued.state === "failed" ? <ErrorNote error={issued.error} /> : null}
    </div>
  );
}
