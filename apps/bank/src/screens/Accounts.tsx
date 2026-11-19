// AUTHORED-BY Claude Opus 5.5
import { ACCOUNTS, BORROWER } from "@mortgage/content/mortgage/facts";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { Link } from "wouter";
import { AccountCard, Balance, FigureTag } from "../components.tsx";
import { org } from "../org.ts";
import { namedAccounts } from "../view.ts";

export const ACCOUNT_LIST = namedAccounts(ACCOUNTS);

/** Online banking home: Alex's two accounts. */
export function Accounts() {
  useEffect(() => applyDocumentMeta(org, "Accounts"), []);
  const total = ACCOUNT_LIST.reduce((sum, account) => sum + account.balanceUsd, 0);
  return (
    <div className="page">
      <header className="greeting">
        <p className="eyebrow">Welcome back</p>
        <h1>{BORROWER.name.split(" ")[0]}'s accounts</h1>
      </header>
      <section className="accounts" aria-label="Your accounts">
        {ACCOUNT_LIST.map((account) => (
          <AccountCard key={account.last4} account={account} />
        ))}
      </section>
      <section className="total" aria-labelledby="total-heading">
        <h2 id="total-heading">Total across your accounts</h2>
        <Balance amount={total} label="Total" />
        <FigureTag />
      </section>
      <aside className="offer" aria-labelledby="proof-heading">
        <h2 id="proof-heading">Buying a home?</h2>
        <p>
          Lenders ask for proof of funds. Instead of downloading statements, send a verified account
          summary to your pod. It shows balances, not transactions.
        </p>
        <Link href="/share" className="button">
          Share a verified account summary
        </Link>
      </aside>
    </div>
  );
}
