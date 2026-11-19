// AUTHORED-BY Claude Opus 5.5
/**
 * "What we received" (tour step 6): everything Copperfield holds, read from its own pod. For each
 * question it has a yes, a proof and the issuer who vouches for the answer; it has no number and
 * no access to Alex's pod. "See for yourself" asks Alex's pod for the income anyway, and the pod
 * refuses.
 */
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { ZK_HONESTY_ITEMS } from "@mortgage/vc-kit/honesty";
import { useEffect, useState } from "react";
import { org } from "../org.ts";
import { loadReceived, tryReadIncome } from "../pod.ts";
import { calendar, world } from "../runtime.ts";
import { usePod } from "../usePod.ts";
import { isQualified, organisationName, statementText } from "../view.ts";

const NOT_RECEIVED = [
  "Your monthly income",
  "Your credit score",
  "Your employer, accounts or address",
  "Any document",
  "Any access to your pod",
];

const LIMITS = ZK_HONESTY_ITEMS.filter((item) =>
  ["low-entropy-enumeration", "digit-budget-leak"].includes(item.id),
);

function dateOf(value: Date): string {
  const iso = value.toISOString().slice(0, 10);
  return `${iso} (${calendar().label(calendar().dayOf(iso))}, simulated)`;
}

function Probe() {
  const [probe, setProbe] = useState<
    | { kind: "idle" }
    | { kind: "busy" }
    | { kind: "done"; status: number; url: string }
    | { kind: "failed"; message: string }
  >({ kind: "idle" });
  async function run() {
    setProbe({ kind: "busy" });
    try {
      setProbe({ kind: "done", ...(await tryReadIncome(world())) });
    } catch (error) {
      setProbe({ kind: "failed", message: error instanceof Error ? error.message : String(error) });
    }
  }
  return (
    <section className="probe" aria-labelledby="probe-heading">
      <h2 id="probe-heading" className="band-title">
        See for yourself
      </h2>
      <p>Ask Alex's pod for the income credential, as Copperfield.</p>
      <button
        type="button"
        className="cta cta-quiet"
        onClick={run}
        disabled={probe.kind === "busy"}
      >
        {probe.kind === "busy" ? "Asking…" : "Ask Alex's pod for the income"}
      </button>
      {probe.kind === "done" ? (
        probe.status === 401 || probe.status === 403 ? (
          <div className="refusal" role="alert">
            <p className="refusal-code">{probe.status} Forbidden</p>
            <p>
              The pod refused <code>GET {new URL(probe.url).pathname}</code>. Copperfield has no
              grant in Alex's pod.
            </p>
          </div>
        ) : (
          <p role="status">The pod answered {probe.status}.</p>
        )
      ) : null}
      {probe.kind === "failed" ? <p role="alert">{probe.message}</p> : null}
    </section>
  );
}

export function ReceivedPage() {
  useEffect(() => applyDocumentMeta(org, "What we received"), []);
  const [state] = usePod(() => loadReceived(world()));
  return (
    <>
      {/* Focusable so a keyboard visitor can reach the tour's "Look" step (it has no button). */}
      <section
        className="band"
        data-tour="lender-b-received"
        aria-labelledby="received-heading"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the tour completes this step on focus
        tabIndex={0}
      >
        <h1 id="received-heading" className="display display-sm">
          What we received
        </h1>
        {state.status === "loading" ? <p role="status">Reading our inbox…</p> : null}
        {state.status === "error" ? (
          <p role="alert">Something went wrong: {state.error.message}</p>
        ) : null}
        {state.status === "ready" && state.value.presentations.length === 0 ? (
          <p>
            Nothing. Copperfield has received nothing from Alex.{" "}
            <a href={appUrl("wallet", "prove", { return: appUrl("lender-b", "received") })}>
              Check if you pre-qualify
            </a>
            .
          </p>
        ) : null}
        {state.status === "ready" && state.value.presentations.length > 0 ? (
          <>
            <p className="received-lede">
              A yes-or-no proof for each question, and who vouches for it. Not the numbers.
            </p>
            {state.value.presentations.map((presentation) => {
              const qualified =
                state.value.result !== undefined && isQualified(state.value.result.description);
              return (
                <div key={presentation.url} className="received">
                  <ul className="answers">
                    {presentation.statements.map((entry) => (
                      <li key={entry.statement.field} className="answer">
                        <span className={qualified ? "answer-yes" : "answer-unknown"}>
                          {qualified
                            ? "Yes"
                            : state.value.result === undefined
                              ? "Unchecked"
                              : "Not proved"}
                        </span>
                        <div>
                          <p className="answer-q">{statementText(entry.statement)}</p>
                          <p className="answer-who">
                            {entry.anchor === undefined
                              ? "No issuer anchor came with this proof."
                              : `Vouched for by ${organisationName(entry.anchor.issuer)}: a signed anchor issued ${dateOf(entry.anchor.validFrom)}.`}{" "}
                            Proof: {entry.proofBytes.toLocaleString("en-US")} bytes.
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="received-grid">
                    <div>
                      <h2 className="band-title">Not received</h2>
                      <ul className="nots">
                        {NOT_RECEIVED.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h2 className="band-title">Exactly what arrived</h2>
                      <p className="small">
                        One JSON message of {presentation.bytes.toLocaleString("en-US")} bytes in
                        our inbox. Its fields:
                      </p>
                      <ul className="keys">
                        {presentation.keys.map((key) => (
                          <li key={key}>
                            <code>{key}</code>
                          </li>
                        ))}
                      </ul>
                      <p className="small">
                        The bounds are our own thresholds. The anchor is the issuer's signed
                        encoding that each proof is checked against; it holds no figure.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {state.value.result === undefined ? null : (
              <div className="record-box">
                <h2 className="band-title">Our record</h2>
                <p>{state.value.result.description}</p>
                <p className="small">Written {dateOf(state.value.result.issued)}.</p>
              </div>
            )}
          </>
        ) : null}
      </section>
      <section className="band band-dark" aria-labelledby="limits-heading">
        <h2 id="limits-heading" className="band-title">
          Limits of these proofs
        </h2>
        {LIMITS.map((item) => (
          <div key={item.id} className="limit">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </section>
      <Probe />
    </>
  );
}
