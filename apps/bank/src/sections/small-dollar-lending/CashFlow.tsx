// AUTHORED-BY Claude Opus 5.5
/**
 * Alder Bank's lending section (flows.md section 4, step 4): the bank's data, in Maya's hands. Alder signs a cash-flow summary of her checking account, with anchors for the cash-flow score and the returned-payment count, into her pod under the write-only slot S3.
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

const ISSUER = "bank" as const;
const org = ORGS[ISSUER];

const { useAction, usePodState } = createPodHooks({ events: { onEvent, onReset }, refusalOf });
const worldOf = lendingPages({ note, podFetch, ready, setDay }, ISSUER);
const journey = () => import("@mortgage/content/small-dollar-lending/journey");

/** The issuer's own records of what it issued to Maya, and the pod's answer to a read of it. */
const RECORDS = [
  "maya-cash-flow",
  "maya-cash-flow-score-anchor",
  "maya-returned-payments-anchor",
] as const;
const WRITTEN = "credentials/cash-flow";

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

export function LendingCashFlow() {
  useEffect(() => applyDocumentMeta(org, "Cash-flow summary"), []);
  const { outcome, reload } = usePodState(load, [ISSUER, "maya"]);
  const send = useAction();
  const view = outcome.state === "ok" ? outcome.value : undefined;
  const done = view !== undefined && view.issued.length === RECORDS.length;
  return (
    <div className="sd-section">
      <h1>Cash-flow summary</h1>
      <p>{PERSON.name} · Checking account ending 3318</p>
      {outcome.state === "loading" ? <p role="status">Reading our records…</p> : null}
      {outcome.state === "error" ? <p role="alert">{outcome.message}</p> : null}
      <section className="sd-card" aria-labelledby="sd-what">
        <h2 id="sd-what">What we sign</h2>
        <dl>
          <dt>Observed</dt>
          <dd>Six months of deposits and balances</dd>
          <dt>Returned payments</dt>
          <dd>Counted over 90 days</dd>
          <dt>Cash-flow score</dt>
          <dd>From the same account data</dd>
          <dt>Anchors</dt>
          <dd>Signed encodings of the score and the count</dd>
        </dl>
        <button
          type="button"
          className="sd-send"
          data-tour="bank-lending-send"
          disabled={done || send.outcome.state === "running"}
          onClick={() =>
            void send.run(async () => {
              const { shareCashFlow } = await journey();
              await shareCashFlow(await worldOf(DAY.apply));
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
          <p className="sd-ok" data-testid="bank-lending-issued">
            Signed and written to {PERSON.name}'s pod under her slot. We keep a pointer and a digest
            for each: {view.issued.join(", ")}.
          </p>
        )}
        {view !== undefined ? (
          <p data-testid="bank-lending-read-back">
            Our read of <code>/{WRITTEN}</code>: the pod answers <strong>{view.readBack}</strong>.{" "}
            {view.readBack === 200 ? "Readable." : "The slot lets us write; it never lets us read."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
