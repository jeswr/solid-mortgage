// AUTHORED-BY Claude Opus 5.5
/**
 * Quillon's lending section (flows.md section 4, step 5): both views of Maya side by side. Quillon signs a summary of her credit file into her pod under the write-only slot S4; lenders ask Quillon for the score itself, under her authorisation.
 */
import "./lending.css";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import { podUrl, statusOf } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { lendingPages } from "@mortgage/content/small-dollar-lending/browser";
import { DAY, PERSON } from "@mortgage/content/small-dollar-lending/facts";
import { createPodHooks } from "@mortgage/demo-kit/react";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { note, onEvent, onReset, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import { useEffect } from "react";

const ISSUER = "bureau" as const;
const org = ORGS[ISSUER];

const { useAction, usePodState } = createPodHooks({ events: { onEvent, onReset }, refusalOf });
const worldOf = lendingPages({ note, podFetch, ready, setDay }, ISSUER);
const journey = () => import("@mortgage/content/small-dollar-lending/journey");

/** The issuer's own records of what it issued to Maya, and the pod's answer to a read of it. */
const RECORDS = ["maya-credit-summary"] as const;
const WRITTEN = "credentials/credit-summary";

async function load() {
  const world = await worldOf();
  const fetcher = world.fetchAs(ISSUER);
  const issued = [];
  for (const record of RECORDS) {
    if ((await statusOf(fetcher, podUrl(world, ISSUER, `issued/${record}`))) === 200) {
      issued.push(record);
    }
  }
  return { issued, readBack: await statusOf(fetcher, podUrl(world, "maya", WRITTEN)) };
}

export function LendingCreditSummary() {
  useEffect(() => applyDocumentMeta(org, "Credit summary"), []);
  const { outcome, reload } = usePodState(load, [ISSUER, "maya"]);
  const send = useAction();
  const view = outcome.state === "ok" ? outcome.value : undefined;
  const done = view !== undefined && view.issued.length === RECORDS.length;
  return (
    <div className="sd-section">
      <h1>Credit summary</h1>
      <p>{PERSON.name} · Consumer credit file</p>
      {outcome.state === "loading" ? <p role="status">Reading our records…</p> : null}
      {outcome.state === "error" ? <p role="alert">{outcome.message}</p> : null}
      <section className="sd-card" aria-labelledby="sd-what">
        <h2 id="sd-what">What we sign</h2>
        <dl>
          <dt>Score</dt>
          <dd>FICO 8, from the file</dd>
          <dt>Accounts</dt>
          <dd>Two trade lines: a thin file</dd>
          <dt>Key factors</dt>
          <dd>The two that weigh most</dd>
          <dt>Lenders</dt>
          <dd>Ask us for the score, under her authorisation</dd>
        </dl>
        <button
          type="button"
          className="sd-send"
          data-tour="bureau-lending-send"
          disabled={done || send.outcome.state === "running"}
          onClick={() =>
            void send.run(async () => {
              const { shareCreditSummary } = await journey();
              await shareCreditSummary(await worldOf(DAY.apply));
              reload();
            })
          }
        >
          {send.outcome.state === "running" ? "Signing…" : done ? "Sent" : "Send"}
        </button>
        {send.outcome.state === "refused" ? (
          <p role="alert" className="sd-alert">
            <strong>Refused by the pod ({send.outcome.status}).</strong> Maya has not approved our
            write slot.
          </p>
        ) : null}
        {send.outcome.state === "error" ? (
          <p role="alert" className="sd-alert">
            {send.outcome.message}
          </p>
        ) : null}
      </section>
      <section className="sd-card" aria-labelledby="sd-records">
        <h2 id="sd-records">Our records</h2>
        {view === undefined || view.issued.length === 0 ? (
          <p>Nothing issued to {PERSON.name} yet.</p>
        ) : (
          <p className="sd-ok" data-testid="bureau-lending-issued">
            Signed and written to {PERSON.name}'s pod under her slot. We keep a pointer and a digest
            for each: {view.issued.join(", ")}.
          </p>
        )}
        {view !== undefined ? (
          <p data-testid="bureau-lending-read-back">
            Our read of <code>/{WRITTEN}</code>: the pod answers <strong>{view.readBack}</strong>.{" "}
            {view.readBack === 200 ? "Readable." : "The slot lets us write; it never lets us read."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
