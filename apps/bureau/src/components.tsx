// AUTHORED-BY Claude Opus 5.5
/** Quillon's few building blocks: a refusal notice, the issued-credentials table, the read-back. */
import { useState } from "react";
import { type Issuance, tryReadBack } from "./data.ts";
import { usePods } from "./pods.tsx";
import { credentialLabel, podAnswer, podPath, stamp } from "./view.ts";

export function Refusal({ status, what }: { status: number; what: "slot" | "authorisation" }) {
  return (
    <p className="refusal" role="status">
      <strong>Refused by Alex's pod.</strong> {podAnswer(status, what)}
    </p>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  const status = (error as { status?: unknown }).status;
  if (status === 401 || status === 403) {
    return (
      <p className="refusal" role="status">
        <strong>Refused by Alex's pod.</strong> {status === 403 ? "403 Forbidden." : "401."} Quillon
        does not have the access this needed.
      </p>
    );
  }
  return (
    <p className="error" role="alert">
      Error: {error instanceof Error ? error.message : String(error)}
    </p>
  );
}

export function IssuedTable({ issuances }: { issuances: readonly Issuance[] }) {
  return (
    <div className="table-wrap">
      <table>
        <caption>Issued into the consumer's pod (from Quillon's issued/ records)</caption>
        <thead>
          <tr>
            <th scope="col">Credential</th>
            <th scope="col">Signed</th>
            <th scope="col">Location</th>
            <th scope="col">Status list entry</th>
            <th scope="col">SHA-256</th>
          </tr>
        </thead>
        <tbody>
          {issuances.map((issuance) => (
            <tr key={issuance.record}>
              <th scope="row">{credentialLabel(issuance.credentialType)}</th>
              <td>{stamp(issuance.asOf)}</td>
              <td className="mono">{podPath(issuance.credentialUrl)}</td>
              <td>
                {issuance.statusIndex}:{" "}
                {issuance.revoked === undefined
                  ? "list unreadable"
                  : issuance.revoked
                    ? "revoked"
                    : "not revoked"}
              </td>
              <td className="mono" title={issuance.sha256}>
                {issuance.sha256.slice(0, 12)}…
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Quillon asks for the summary it wrote. The answer is printed as it came. */
export function ReadBack() {
  const pods = usePods();
  const [status, setStatus] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  return (
    <div className="readback">
      <p>
        Quillon keeps a record of what it signed, not a copy. Its access to
        /credentials/credit-summary is write-only.
      </p>
      <button
        type="button"
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
        <Refusal status={status} what="slot" />
      ) : (
        <p role="status">{podAnswer(status, "slot")}</p>
      )}
    </div>
  );
}
