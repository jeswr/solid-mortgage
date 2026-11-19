// AUTHORED-BY Claude Opus 5.5
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { Link } from "wouter";
import { Balance, FigureTag } from "../components.tsx";
import { org } from "../org.ts";
import { usePods } from "../pods.tsx";
import { averageBalance, bankDate, ledger, money } from "../view.ts";
import { ACCOUNT_LIST } from "./Accounts.tsx";

/** One account and its last sixty days: the bank's own records, never sent to a pod. */
export function AccountDetail({ last4 }: { last4: string }) {
  const account = ACCOUNT_LIST.find((candidate) => candidate.last4 === last4);
  useEffect(
    () => applyDocumentMeta(org, account === undefined ? "Account not found" : account.name),
    [account],
  );
  const pods = usePods();
  if (account === undefined) {
    return (
      <div className="page">
        <h1>We could not find that account</h1>
        <p>
          <Link href="/">Back to your accounts</Link>
        </p>
      </div>
    );
  }
  const calendar = pods?.world().calendar;
  const transactions = calendar === undefined ? [] : ledger(calendar, account);
  return (
    <div className="page">
      <p className="crumbs">
        <Link href="/">Accounts</Link> <span aria-hidden="true">›</span> {account.name}
      </p>
      <header className="account-head">
        <div>
          <h1>
            {account.name} <span className="digits">··{account.last4}</span>
          </h1>
          <p className="caption">Available balance</p>
          <Balance amount={account.balanceUsd} label="Available balance" />
        </div>
        {calendar === undefined ? null : (
          <dl className="facts">
            <div>
              <dt>60-day average balance</dt>
              <dd>{money(averageBalance(calendar, account, transactions))}</dd>
            </div>
            <div>
              <dt>Statement period</dt>
              <dd>
                {transactions.length === 0
                  ? "…"
                  : `${bankDate(transactions.at(-1)?.date ?? "")} to ${bankDate(transactions[0]?.date ?? "")}`}
              </dd>
            </div>
          </dl>
        )}
      </header>
      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading">Activity</h2>
        {calendar === undefined ? (
          <p role="status">Loading activity…</p>
        ) : (
          <div className="table-wrap">
            <table className="ledger">
              <caption className="sr-only">Transactions, most recent first</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                  <th scope="col" className="num">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((entry) => (
                  <tr key={`${entry.date}-${entry.description}`}>
                    <td>{bankDate(entry.date)}</td>
                    <th scope="row">{entry.description}</th>
                    <td className={`num ${entry.amountUsd > 0 ? "credit" : ""}`}>
                      {entry.amountUsd > 0 ? "+" : ""}
                      {money(entry.amountUsd)}
                    </td>
                    <td className="num">{money(entry.balanceUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <FigureTag />
        <p className="small">
          Your transactions stay with Alder Bank. A verified account summary carries balances only.
        </p>
      </section>
    </div>
  );
}
