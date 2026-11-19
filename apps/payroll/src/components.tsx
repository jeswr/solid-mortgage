// AUTHORED-BY Claude Opus 5.5
/** Ledgerly's own building blocks: icons, the issuance card and the read-back check. */
import { useState } from "react";
import { type Issuance, tryReadBack } from "./data.ts";
import { usePods } from "./pods.tsx";
import { credentialLabel, podPath, refusalText, shortDate } from "./view.ts";

type IconName = "home" | "pay" | "share" | "shield";

const PATHS: Record<IconName, string> = {
  home: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  pay: "M4 6h16v12H4zM4 10h16M8 15h3",
  share: "M12 4v11M7.5 8.5 12 4l4.5 4.5M5 14v5h14v-5",
  shield: "M12 3.5 19 6v6c0 4.2-3 7.4-7 8.5-4-1.1-7-4.3-7-8.5V6zM9 12l2.2 2.2L15.5 10",
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="icon">
      <path
        d={PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A request the pod refused, shown as what it is. */
export function Refusal({ status, what }: { status: number; what: string }) {
  return (
    <div className="refusal" role="status">
      <strong>Refused by Alex's pod.</strong> {what}
      <span className="mono"> {refusalText(status)}</span>
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number" && (status === 401 || status === 403)) {
    return <Refusal status={status} what="The request needed access Ledgerly does not have." />;
  }
  return (
    <p className="error" role="alert">
      Something went wrong: {error instanceof Error ? error.message : String(error)}
    </p>
  );
}

function StatusEntry({ issuance }: { issuance: Issuance }) {
  const state = issuance.revoked === undefined ? "unknown" : issuance.revoked ? "revoked" : "valid";
  return (
    <span className={`status status-${state}`}>
      #{issuance.statusIndex} ·{" "}
      {state === "unknown" ? "list unreadable" : state === "revoked" ? "revoked" : "not revoked"}
    </span>
  );
}

/** One issuance from Ledgerly's own `issued/` drawer. */
export function IssuanceRow({ issuance }: { issuance: Issuance }) {
  return (
    <tr>
      <th scope="row">
        {credentialLabel(issuance.credentialType)}
        <span className="sub mono">{issuance.name}</span>
      </th>
      <td>{shortDate(issuance.asOf)}</td>
      <td className="mono">{podPath(issuance.credentialUrl)}</td>
      <td>
        <StatusEntry issuance={issuance} />
      </td>
      <td className="mono digest" title={issuance.sha256}>
        {issuance.sha256.slice(0, 12)}…
      </td>
    </tr>
  );
}

export function IssuanceTable({ issuances }: { issuances: readonly Issuance[] }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">Credentials Ledgerly has issued</caption>
        <thead>
          <tr>
            <th scope="col">Credential</th>
            <th scope="col">Signed</th>
            <th scope="col">Written to</th>
            <th scope="col">Status list entry</th>
            <th scope="col">SHA-256</th>
          </tr>
        </thead>
        <tbody>
          {issuances.map((issuance) => (
            <IssuanceRow key={issuance.record} issuance={issuance} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Ledgerly tries to read what it wrote. The pod's answer is shown as it came. */
export function ReadBack() {
  const pods = usePods();
  const [status, setStatus] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  return (
    <div className="readback">
      <p>
        Ledgerly keeps a record of what it signed, not a copy. Its grant is a write-only slot: it
        can replace the credential, never read it.
      </p>
      <button
        type="button"
        className="ghost"
        disabled={pods === null || busy}
        onClick={async () => {
          if (pods === null) return;
          setBusy(true);
          try {
            setStatus(await tryReadBack(pods.world()));
          } finally {
            setBusy(false);
          }
        }}
      >
        Try to read it back from Alex's pod
      </button>
      {status === undefined ? null : status === 401 || status === 403 ? (
        <Refusal status={status} what="Ledgerly asked to read credentials/employment-income." />
      ) : (
        <p className="mono" role="status">
          {refusalText(status)}
        </p>
      )}
    </div>
  );
}
