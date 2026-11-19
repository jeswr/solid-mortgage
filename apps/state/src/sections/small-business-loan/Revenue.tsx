// AUTHORED-BY Claude Opus 5.5
/**
 * The Department of Revenue's business tax page (small business loan demo, flows.md section 6,
 * step 2). The department signs a tax compliance credential for Northwind Logistics LLC with
 * vc-kit: compliant, filings current through the last quarter end, a turnover band and no figure.
 * Northwind's wallet stores it in Northwind's pod; the department keeps only an issuance record
 * and its status list. The page reads the credential back from Northwind's pod.
 */
import "./revenue.css";
import { loanWorld } from "@mortgage/content/small-business-loan/browser";
import { DAY, TAX } from "@mortgage/content/small-business-loan/facts";
import type { TaxComplianceCredential } from "@mortgage/data-model";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { note, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import { useEffect } from "react";
import { org } from "../../org.ts";
import { startDemo, useAction, usePodState } from "../../runtime.ts";

const STATE = "state" as const;
const HOLDER = "northwind" as const;
const runtime = { note, podFetch, ready, setDay };
const journey = () => import("@mortgage/content/small-business-loan/journey");
const tax = () => import("@mortgage/content/small-business-loan/tax");

const BANDS: Record<string, string> = {
  "1m-5m": "$1 million to $5 million",
  "500k-1m": "$500,000 to $1 million",
  "over-5m": "over $5 million",
  "under-500k": "under $500,000",
};

const dateOnly = (date: Date | undefined) =>
  date === undefined
    ? "–"
    : date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      });

interface RevenueView {
  /** The credential in Northwind's pod, read back as Northwind. */
  credential: TaxComplianceCredential | undefined;
  /** The versions the department has issued (its own issuance records). */
  versions: number[];
}

async function loadRevenue(): Promise<RevenueView> {
  await startDemo();
  const world = await loanWorld(runtime, STATE);
  const { readTaxCredential, taxVersions } = await tax();
  const [credential, versions] = await Promise.all([
    readTaxCredential(world, HOLDER),
    taxVersions(world),
  ]);
  return { credential, versions };
}

/** Step 2: `revenue`. */
export function Revenue() {
  useEffect(() => applyDocumentMeta(org, "Department of Revenue"), []);
  const { outcome, reload } = usePodState(loadRevenue, [STATE]);
  const issue = useAction();
  const view = outcome.state === "ok" ? outcome.value : undefined;
  const credential = view?.credential;
  const subject = credential?.credentialSubject;
  return (
    <main>
      <h1>Department of Revenue</h1>
      <p className="lede">
        Business tax account · Northwind Logistics LLC · taxpayer ID ending{" "}
        <span className="revenue-mono">{TAX.taxIdLast4}</span>
      </p>
      {outcome.state === "loading" ? (
        <p role="status">Connecting to the pods…</p>
      ) : outcome.state === "refused" ? (
        <p role="alert" className="alert">
          <strong>Refused by the pod ({outcome.status}).</strong>
        </p>
      ) : outcome.state === "error" ? (
        <p role="alert" className="alert">
          {outcome.message}
        </p>
      ) : null}
      <ol className="steps">
        <li>
          <h2>Tax compliance credential</h2>
          <p>
            A lender may ask whether Northwind's state taxes are in order. We sign a credential that
            says so, and Northwind keeps it in its own pod. It states the turnover band, never a
            figure, and it is valid for {TAX.validDays} days.
          </p>
          <button
            type="button"
            className="primary"
            data-tour="state-revenue-issue-tax"
            disabled={outcome.state === "loading" || issue.outcome.state === "running"}
            onClick={() =>
              void issue.run(async () => {
                await startDemo();
                const world = await loanWorld(runtime, STATE, DAY.tax);
                await (await journey()).taxComplianceStep(world);
                reload();
              })
            }
          >
            {issue.outcome.state === "running" ? "Signing…" : "Issue tax compliance credential"}
          </button>
          {issue.outcome.state === "ok" ? (
            <p role="status" className="ok">
              Signed. The credential is in Northwind's pod.
            </p>
          ) : issue.outcome.state === "refused" ? (
            <p role="alert" className="alert">
              <strong>Refused by the pod ({issue.outcome.status}).</strong> Northwind's wallet did
              not store the credential.
            </p>
          ) : issue.outcome.state === "error" ? (
            <p role="alert" className="alert">
              {issue.outcome.message}
            </p>
          ) : null}
        </li>
        <li>
          <h2>In Northwind's pod</h2>
          {subject === undefined || credential === undefined ? (
            <p className="muted">No tax compliance credential yet.</p>
          ) : (
            <dl className="revenue-facts" data-testid="state-tax-credential">
              <dt>Status</dt>
              <dd>{subject.status === "compliant" ? "Compliant" : "Not compliant"}</dd>
              <dt>Filings current through</dt>
              <dd>{dateOnly(subject.filingsCurrentThrough)}</dd>
              <dt>Turnover band</dt>
              <dd>{BANDS[subject.turnoverBand ?? ""] ?? "–"}</dd>
              <dt>Valid</dt>
              <dd>
                {dateOnly(credential.validFrom)} to {dateOnly(credential.validUntil)}
              </dd>
            </dl>
          )}
          {view !== undefined && view.versions.length > 0 ? (
            <p className="provenance">
              Read back from Northwind's pod at credentials/tax-compliance. We keep issuance record
              version {view.versions.at(-1)} and our status list; the credential itself is
              Northwind's.
            </p>
          ) : null}
        </li>
      </ol>
    </main>
  );
}
