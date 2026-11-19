// AUTHORED-BY Claude Opus 5.5
/** Alder Bank's building blocks: the account card, the issued-credential card, the read-back check. */
import { FIGURE_TAG } from "@mortgage/content/mortgage/facts";
import { useState } from "react";
import { Link } from "wouter";
import { type Issuance, SLOTS, type SlotName, tryReadBack } from "./data.ts";
import { usePods } from "./pods.tsx";
import { type Account, bankDate, credentialLabel, podAnswer, podPath, splitMoney } from "./view.ts";

/** A balance in large serif numerals, cents set smaller. */
export function Balance({ amount, label }: { amount: number; label: string }) {
  const { dollars, cents } = splitMoney(amount);
  return (
    <p className="balance">
      <span className="sr-only">{label}: </span>
      {dollars}
      <span className="cents">.{cents}</span>
    </p>
  );
}

export function FigureTag() {
  return <p className="figure-tag">{FIGURE_TAG}</p>;
}

export function AccountCard({ account }: { account: Account }) {
  return (
    <article className="account-card">
      <header>
        <h2>
          <Link href={`/accounts/${account.last4}`}>
            {account.name} <span className="digits">··{account.last4}</span>
          </Link>
        </h2>
        <p className="kind">{account.kind === "checking" ? "Checking" : "Savings"}</p>
      </header>
      <p className="caption">Available balance</p>
      <Balance amount={account.balanceUsd} label="Available balance" />
    </article>
  );
}

export function Refusal({ status, slot }: { status: number; slot: SlotName }) {
  return (
    <div className="refusal" role="status">
      <strong>Alex's pod refused.</strong> {podAnswer(status, SLOTS[slot].grant)}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  const status = (error as { status?: unknown }).status;
  if (status === 401 || status === 403) {
    return (
      <div className="refusal" role="status">
        <strong>Alex's pod refused.</strong> {status === 403 ? "403 Forbidden" : "401 Unauthorized"}
        . Alder Bank does not have the access this needed.
      </div>
    );
  }
  return (
    <p className="error" role="alert">
      Something went wrong: {error instanceof Error ? error.message : String(error)}
    </p>
  );
}

function StatusEntry({ issuance }: { issuance: Issuance }) {
  const text =
    issuance.revoked === undefined
      ? "status list unreadable"
      : issuance.revoked
        ? "revoked"
        : "not revoked";
  return (
    <span className={`status ${issuance.revoked ? "status-revoked" : ""}`}>
      Entry {issuance.statusIndex}: {text}
    </span>
  );
}

/** Which slot an issuance went to. */
export function slotOf(issuance: Issuance): SlotName | undefined {
  const path = podPath(issuance.credentialUrl).slice(1);
  return (Object.keys(SLOTS) as SlotName[]).find((slot) => SLOTS[slot].path === path);
}

/** One credential Alder Bank signed into Alex's pod, from its own `issued/` record. */
export function IssuedCard({ issuance }: { issuance: Issuance }) {
  const slot = slotOf(issuance);
  return (
    <article className="issued-card">
      <h3>{credentialLabel(issuance.credentialType)}</h3>
      <dl>
        <div>
          <dt>Signed</dt>
          <dd>{bankDate(issuance.asOf)}</dd>
        </div>
        <div>
          <dt>Written to</dt>
          <dd className="mono">{podPath(issuance.credentialUrl)}</dd>
        </div>
        <div>
          <dt>Status list</dt>
          <dd>
            <StatusEntry issuance={issuance} />
          </dd>
        </div>
        <div>
          <dt>Fingerprint (SHA-256)</dt>
          <dd className="mono digest" title={issuance.sha256}>
            {issuance.sha256.slice(0, 16)}…
          </dd>
        </div>
      </dl>
      {slot === undefined ? null : (
        <ReadBack slot={slot} label={credentialLabel(issuance.credentialType)} />
      )}
    </article>
  );
}

/** The bank asks the pod for what it wrote. The answer is shown as it came. */
export function ReadBack({ slot, label }: { slot: SlotName; label: string }) {
  const pods = usePods();
  const [status, setStatus] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  return (
    <div className="readback">
      <p>
        {SLOTS[slot].grant === "write-only"
          ? "We keep a record of what we signed, not a copy. Our access to this slot was to write it, never to read it."
          : "We signed this when you opened your account. Your wallet stored it; we were never given access to that part of your pod."}
      </p>
      <button
        type="button"
        className="quiet"
        aria-label={`Try to read it back: ${label}`}
        disabled={pods === null || busy}
        onClick={async () => {
          if (pods === null) return;
          setBusy(true);
          try {
            setStatus(await tryReadBack(pods.world(), slot));
          } finally {
            setBusy(false);
          }
        }}
      >
        Try to read it back
      </button>
      {status === undefined ? null : status === 401 || status === 403 ? (
        <Refusal status={status} slot={slot} />
      ) : (
        <p role="status">{podAnswer(status, SLOTS[slot].grant)}</p>
      )}
    </div>
  );
}
