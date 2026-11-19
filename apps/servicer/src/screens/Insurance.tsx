// AUTHORED-BY Claude Opus 5.5
import { ORGS } from "@mortgage/content/orgs";
import { EvidenceOfInsuranceCredential, MORT } from "@mortgage/data-model";
import { ORG_SLUGS, webidFor } from "@mortgage/demo-kit/registry";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { usePodLog } from "../log.ts";
import { podUrl } from "../pods.ts";
import { typedSubject, usePodResource } from "../read.ts";
import { canRead, connection, EVIDENCE_PATH, longDate, usd } from "../view.ts";
import { Outcome } from "./Outcome.tsx";
import { NotConnected, Shell } from "./Shell.tsx";

const asEvidence = (url: string, dataset: DatasetCore) =>
  new EvidenceOfInsuranceCredential(
    typedSubject(dataset, MORT.EvidenceOfInsuranceCredential) ?? url,
    dataset,
    DataFactory,
  );

/** The organisation whose WebID signed the credential, by name. */
function issuerName(issuer: string): string {
  const origin = new URL(issuer).origin;
  const slug = ORG_SLUGS.find((candidate) => webidFor(ORGS[candidate].actsAs, origin) === issuer);
  return slug === undefined ? issuer : ORGS[slug].organisation;
}

function Policy({ evidence }: { evidence: EvidenceOfInsuranceCredential }) {
  const claims = evidence.credentialSubject;
  return (
    <section className="panel" aria-labelledby="policy-heading">
      <p className="kicker">Signed by {issuerName(evidence.issuer)}</p>
      <h2 id="policy-heading">Policy {claims.policyNumber}</h2>
      <dl className="pairs">
        <div>
          <dt>In force</dt>
          <dd>
            {longDate(claims.policyStart)} to {longDate(claims.policyEnd)}
          </dd>
        </div>
        <div>
          <dt>Dwelling cover</dt>
          <dd>{usd(claims.dwellingCoverageUsd, false)}</dd>
        </div>
        <div>
          <dt>Yearly premium (paid from escrow)</dt>
          <dd>{usd(claims.annualPremiumUsd, false)}</dd>
        </div>
        <div>
          <dt>Mortgagee clause</dt>
          <dd>{claims.mortgageeClause}</dd>
        </div>
      </dl>
      <p className="source">Read from your pod · {EVIDENCE_PATH}</p>
    </section>
  );
}

export function Insurance() {
  const log = usePodLog();
  const allowed = canRead(connection(log));
  const evidence = usePodResource(podUrl("alex", EVIDENCE_PATH), allowed, asEvidence);
  return (
    <Shell page="Insurance">
      <section className="hero">
        <h1>Insurance tracking</h1>
        <p>
          We read your policy from your pod. When your insurer renews it there, we see the renewal
          without a letter.
        </p>
      </section>
      {allowed ? (
        <Outcome read={evidence} what="your proof of insurance">
          {(value) => <Policy evidence={value} />}
        </Outcome>
      ) : (
        <NotConnected />
      )}
    </Shell>
  );
}
