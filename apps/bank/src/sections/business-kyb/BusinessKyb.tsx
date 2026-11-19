// AUTHORED-BY Claude Opus 5.5
/**
 * Business onboarding at Alder Bank (business KYB demo, flows.md section 3, steps 6 and 11).
 * Due diligence reads Northwind's three register credentials from Northwind's pod under grant K1,
 * checks each at source (signature against Halyard's published key, shape, validity, Halyard's
 * status list), and writes the bank's own CDD decision record in the bank's pod. Monitoring reads
 * the ownership credential again; after Northwind withdraws K1 the pod refuses it, and the bank
 * keeps its record (31 CFR 1010.230(i)).
 */
// Checking a credential needs the signing library's Buffer stand-in, installed before it loads.
import "@mortgage/vc-kit/browser/buffer";
import "./business-kyb.css";
import type { DueDiligence, Reread } from "@mortgage/content/business-kyb/banks";
import { kybWorld } from "@mortgage/content/business-kyb/browser";
import { DAY, ENTITY, percent } from "@mortgage/content/business-kyb/facts";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import { ORGS } from "@mortgage/content/orgs";
import type { CddDecisionRecord } from "@mortgage/data-model";
import { createPodHooks } from "@mortgage/demo-kit/react";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { note, onEvent, onReset, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import { useEffect, useState } from "react";
import { Link } from "wouter";

const BANK = "bank" as const;
const org = ORGS[BANK];
const runtime = { note, podFetch, ready, setDay };
const journey = () => import("@mortgage/content/business-kyb/journey");
const banks = () => import("@mortgage/content/business-kyb/banks");

const { useAction, usePodState } = createPodHooks({ events: { onEvent, onReset }, refusalOf });

const CREDENTIAL_LABELS: Record<string, string> = {
  "beneficial-ownership": "Beneficial ownership",
  "officer-authorisation": "Officer authorisation",
  "org-identity": "Organisational identity",
};

const dateOnly = (date: Date) =>
  date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });

function Header({ title }: { title: string }) {
  useEffect(() => applyDocumentMeta(org, title), [title]);
  return (
    <>
      <p className="kyb-eyebrow">Business banking · Onboarding</p>
      <h1>{title}</h1>
      <p className="kyb-lede">
        {ENTITY.legalName} · LEI <span className="kyb-mono">{ENTITY.lei}</span> (illustrative)
      </p>
    </>
  );
}

function RecordCard({ record }: { record: CddDecisionRecord }) {
  return (
    <section className="kyb-card" aria-labelledby="kyb-record" data-testid="bank-cdd-record">
      <h2 id="kyb-record">Our due diligence record</h2>
      <dl className="kyb-dl">
        <dt>Decision</dt>
        <dd data-testid="bank-cdd-decision">
          {record.decision === "opened" ? "Account opened" : (record.decision ?? "Unknown")}
        </dd>
        <dt>Checked on</dt>
        <dd>{dateOnly(record.checkDate)}</dd>
        <dt>Owners at 25% or more</dt>
        <dd>{record.beneficialOwners.join(", ") || "None"}</dd>
        <dt>Control person</dt>
        <dd>{record.controlPerson}</dd>
        <dt>Credentials checked</dt>
        <dd>{record.checkedCredentials.length}</dd>
      </dl>
      <p className="kyb-small">
        Kept in Alder Bank's own pod. It stays for five years after the account closes, whatever
        Northwind later withdraws.
      </p>
    </section>
  );
}

function Refused({ status, what }: { status: number; what: string }) {
  return (
    <p role="alert" className="kyb-alert">
      <strong>Refused by the pod ({status}).</strong> {what}
    </p>
  );
}

async function loadRecord() {
  const world = await kybWorld(runtime, BANK);
  return (await banks()).readCddRecord(world);
}

/** The onboarding overview (`kyb`). */
export function KybOnboarding() {
  const { outcome } = usePodState(loadRecord, [BANK]);
  const record = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <div className="kyb">
      <Header title="Business onboarding" />
      <ol className="kyb-steps">
        <li>
          <strong>Northwind grants access.</strong> Jordan Blake approves our request in Northwind's
          wallet (grant K1: read the identity, officer and ownership credentials, for one year).
        </li>
        <li>
          <strong>We run due diligence.</strong> Each credential is read from Northwind's pod and
          checked at Halyard, the register that signed it.
        </li>
        <li>
          <strong>We keep our record.</strong> The decision goes in our own pod.
        </li>
      </ol>
      {outcome.state === "loading" ? <p role="status">Reading our records…</p> : null}
      {record !== undefined ? <RecordCard record={record} /> : null}
      <p>
        <Link href="/kyb/due-diligence" className="kyb-button">
          Go to due diligence
        </Link>
      </p>
    </div>
  );
}

/** Step 6 (and the monitoring read of step 11): `kyb/due-diligence`. */
export function KybDueDiligence() {
  const { outcome, reload } = usePodState(loadRecord, [BANK]);
  const run = useAction();
  const again = useAction();
  const [result, setResult] = useState<DueDiligence | undefined>();
  const [reread, setReread] = useState<Reread | undefined>();
  const record = outcome.state === "ok" ? outcome.value : undefined;
  return (
    <div className="kyb">
      <Header title="Customer due diligence" />
      <p>
        Read Northwind's credentials under grant K1 and check each one at source. No documents are
        uploaded and nothing is copied except our own decision record.
      </p>
      <button
        type="button"
        className="kyb-button"
        data-tour="bank-kyb-run-cdd"
        disabled={run.outcome.state === "running"}
        onClick={() =>
          void run.run(async () => {
            const world = await kybWorld(runtime, BANK, DAY.onboarding);
            setResult(await (await journey()).dueDiligence(world));
            reload();
          })
        }
      >
        {run.outcome.state === "running" ? "Checking…" : "Run due diligence"}
      </button>
      {run.outcome.state === "refused" ? (
        <Refused
          status={run.outcome.status}
          what="Northwind has not granted Alder Bank access to its credentials. Jordan Blake decides that in Northwind's wallet."
        />
      ) : null}
      {run.outcome.state === "error" ? (
        <p role="alert" className="kyb-alert">
          {run.outcome.message}
        </p>
      ) : null}
      {result !== undefined ? (
        <section className="kyb-card" aria-labelledby="kyb-checks">
          <h2 id="kyb-checks">Checked at source</h2>
          <table className="kyb-table">
            <caption className="kyb-small">Each credential, verified against Halyard</caption>
            <thead>
              <tr>
                <th scope="col">Credential</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {result.checks.map((check) => (
                <tr key={check.name} data-testid={`bank-check-${check.name}`}>
                  <th scope="row">{CREDENTIAL_LABELS[check.name]}</th>
                  <td>{check.verified ? "Verified" : `Failed: ${check.errors.join("; ")}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {record !== undefined ? <RecordCard record={record} /> : null}
      {record !== undefined ? (
        <section className="kyb-card" aria-labelledby="kyb-monitor">
          <h2 id="kyb-monitor">Monitoring</h2>
          <p className="kyb-small">
            Read the ownership credential again under K1, as our monitoring does when Halyard
            changes it.
          </p>
          <button
            type="button"
            className="kyb-button secondary"
            disabled={again.outcome.state === "running"}
            onClick={() =>
              void again.run(async () => {
                const world = await kybWorld(runtime, BANK, DAY.sale);
                setReread(await (await banks()).rereadOwnership(world, BANK, "16:30"));
              })
            }
          >
            {again.outcome.state === "running" ? "Reading…" : "Read again"}
          </button>
          {reread !== undefined && reread.status === 200 ? (
            <ul className="kyb-owners" data-testid="bank-monitor-owners">
              {reread.ownership?.owners.map((owner) => (
                <li key={owner.name}>
                  {owner.name}: {percent(owner.bps)}
                </li>
              ))}
            </ul>
          ) : null}
          {reread !== undefined && reread.status !== 200 ? (
            <Refused
              status={reread.status}
              what="Northwind withdrew K1 when it closed its account. We keep our record; we can no longer refresh it."
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
