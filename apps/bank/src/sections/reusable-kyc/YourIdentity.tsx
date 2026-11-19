// AUTHORED-BY Claude Opus 5.5
/**
 * Your identity (reusable-KYC demo, flows.md section 8, steps 1 and 6): what Alder Bank verified
 * when Alex opened the account, as a signed statement for Alex's pod. "Get attestation" signs
 * version 1; "Report ID lost" checks a replacement, signs the next version and withdraws the old
 * one in the bank's status list. The page shows the bank's own records of what it issued.
 */
import "./reusable-kyc.css";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { reusableKycWorld } from "@mortgage/content/reusable-kyc/browser";
import { ACCOUNT_OPENED, ATTESTATION_VALID_DAYS, DAY } from "@mortgage/content/reusable-kyc/facts";
import { dayOfStep } from "@mortgage/content/reusable-kyc/mount";
import { createPodHooks } from "@mortgage/demo-kit/react";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { note, onEvent, onReset, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import { useEffect } from "react";

const BANK = "bank" as const;
const org = ORGS[BANK];

const { useAction, usePodState } = createPodHooks({ events: { onEvent, onReset }, refusalOf });

/** The day the page reads on: the tour step's day, else the day Alex applies for the card. */
function readingDay(): number {
  return (
    dayOfStep(new URLSearchParams(window.location.search).get("step") ?? undefined) ?? DAY.apply
  );
}

function bankWorld(day: number): Promise<World> {
  return reusableKycWorld({ note, podFetch, ready, setDay }, BANK, day);
}

/** The journey functions, with the signing library's Buffer stand-in loaded first. */
async function journey() {
  await import("@mortgage/vc-kit/browser/buffer");
  return import("@mortgage/content/reusable-kyc/journey");
}

interface Issued {
  version: number;
  issued: Date;
  checks: { method: string; date: string; description: string }[];
}

const METHOD: Readonly<Record<string, string>> = {
  documentary: "Documentary",
  "government-list": "Government lists",
  "non-documentary": "Non-documentary",
};

async function load(): Promise<Issued[]> {
  const world = await bankWorld(readingDay());
  const { checksFor, issuedVersions, readIssuance } = await import(
    "@mortgage/content/reusable-kyc/attestation"
  );
  const issued: Issued[] = [];
  for (const version of await issuedVersions(world)) {
    const pointer = await readIssuance(world, version);
    // The checks as they stood on the day that version was signed.
    const day = world.calendar.dayOf(pointer.asOf);
    issued.push({
      checks: checksFor({ ...world, day }, version),
      issued: pointer.asOf,
      version,
    });
  }
  return issued;
}

const when = (date: Date) =>
  date.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });

export function YourIdentity() {
  useEffect(() => applyDocumentMeta(org, "Your identity"), []);
  const { outcome, reload } = usePodState(load, [BANK, "alex"]);
  const get = useAction();
  const lost = useAction();
  const issued = outcome.state === "ok" ? outcome.value : [];
  const latest = issued.at(-1);
  const busy = get.outcome.state === "running" || lost.outcome.state === "running";
  return (
    <div className="kyc">
      <p className="caption">Settings · Identity</p>
      <h1>Your identity</h1>
      <p className="lede">
        We checked who you are when you opened your account on{" "}
        {new Date(`${ACCOUNT_OPENED}T00:00:00Z`).toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          timeZone: "UTC",
          year: "numeric",
        })}
        . We can sign a statement of those checks for your pod: which checks, by what method, and
        when. It holds no images of your documents, and we can withdraw it.
      </p>
      {outcome.state === "loading" ? <p role="status">Reading our records…</p> : null}
      {outcome.state === "refused" ? (
        <p role="alert" className="refusal">
          <strong>Refused by the pod ({outcome.status}).</strong>
        </p>
      ) : null}
      {outcome.state === "error" ? (
        <p role="alert" className="error">
          {outcome.message}
        </p>
      ) : null}

      {latest === undefined ? (
        outcome.state === "ok" ? (
          <p>No statement issued yet.</p>
        ) : null
      ) : (
        <section className="kyc-statement" aria-labelledby="kyc-statement-heading">
          <h2 id="kyc-statement-heading">KYC attestation, version {latest.version}</h2>
          <dl data-testid="bank-kyc-statement">
            <dt>Signed</dt>
            <dd>{when(latest.issued)}</dd>
            <dt>Valid for</dt>
            <dd>{ATTESTATION_VALID_DAYS} days</dd>
            <dt>Status</dt>
            <dd className="status">In force on our status list</dd>
            <dt>Held in</dt>
            <dd>Your pod, under Credentials</dd>
          </dl>
          <ul className="kyc-checks" aria-label="Checks this statement records">
            {latest.checks.map((check) => (
              <li key={check.method}>
                <strong>{METHOD[check.method] ?? check.method}</strong> · {check.date} ·{" "}
                {check.description}
              </li>
            ))}
          </ul>
          {latest.version > 1 ? (
            <p className="status status-revoked" data-testid="bank-kyc-withdrawn">
              Version {latest.version - 1} is withdrawn on our status list.
            </p>
          ) : null}
        </section>
      )}

      <div className="kyc-actions">
        <button
          type="button"
          className="primary"
          data-tour="bank-kyc-get-attestation"
          disabled={busy || outcome.state !== "ok" || latest !== undefined}
          onClick={() =>
            void get.run(async () => {
              const { getAttestation } = await journey();
              await getAttestation(await bankWorld(DAY.apply));
              reload();
            })
          }
        >
          {get.outcome.state === "running" ? "Signing…" : "Get attestation"}
        </button>
        <button
          type="button"
          className="quiet"
          data-tour="bank-kyc-report-lost"
          disabled={busy || latest === undefined}
          onClick={() =>
            void lost.run(async () => {
              const { reportDocumentLost } = await journey();
              await reportDocumentLost(await bankWorld(DAY.lost));
              reload();
            })
          }
        >
          {lost.outcome.state === "running" ? "Re-issuing…" : "Report ID lost"}
        </button>
      </div>
      {get.outcome.state === "ok" ? (
        <p role="status" className="kyc-ok">
          Signed and stored in your pod. Share it from your wallet with an organisation that relies
          on our checks.
        </p>
      ) : null}
      {lost.outcome.state === "ok" ? (
        <p role="status" className="kyc-ok">
          We checked your replacement document and signed a new statement. The old one is withdrawn:
          anyone who checks it will see that it no longer stands.
        </p>
      ) : null}
      {[get.outcome, lost.outcome].map((action, index) =>
        action.state === "refused" ? (
          <p key={index === 0 ? "get" : "lost"} role="alert" className="refusal">
            <strong>Refused by the pod ({action.status}).</strong>
          </p>
        ) : action.state === "error" ? (
          <p key={index === 0 ? "get" : "lost"} role="alert" className="error">
            {action.message}
          </p>
        ) : null,
      )}
    </div>
  );
}
