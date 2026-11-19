// AUTHORED-BY Claude Opus 5.5
import { INSURANCE } from "@mortgage/content/mortgage/facts";
import { statusOf } from "@mortgage/content/mortgage/world";
import { CredentialPointer } from "@mortgage/data-model";
import { podFetch } from "@mortgage/pod-runtime";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { useCallback, useState } from "react";
import { Link } from "wouter";
import { usePodLog } from "../log.ts";
import { podUrl } from "../pods.ts";
import { usePodResource } from "../read.ts";
import { bindState, EVIDENCE_PATH, ISSUED_PATH } from "../view.ts";
import { Refusal, Shell } from "./Shell.tsx";

const asPointer = (url: string, dataset: DatasetCore) =>
  new CredentialPointer(url, dataset, DataFactory);

/** Try to read the evidence back, as Wrenfield. G7 lets it write there, not read. */
function ReadBack() {
  const [status, setStatus] = useState<number | "reading" | undefined>();
  const tryRead = useCallback(() => {
    setStatus("reading");
    statusOf(podFetch, podUrl("alex", EVIDENCE_PATH)).then(setStatus, () => setStatus(0));
  }, []);
  return (
    <section className="card" aria-labelledby="readback-heading">
      <h2 id="readback-heading">Can Wrenfield read it back?</h2>
      <p>
        Wrenfield may put the evidence in your insurance drawer. It may not read the drawer. Try it.
      </p>
      <button type="button" className="secondary" onClick={tryRead} disabled={status === "reading"}>
        Read the evidence as Wrenfield
      </button>
      {typeof status === "number" ? (
        status === 401 || status === 403 ? (
          <Refusal status={status}>
            Wrenfield wrote the evidence but cannot read it back. Your lender and your servicer read
            it under their own grants.
          </Refusal>
        ) : (
          <p className="muted">The pod answered {status}.</p>
        )
      ) : null}
    </section>
  );
}

export function Evidence() {
  const log = usePodLog();
  const bound = bindState(log) === "bound";
  const pointer = usePodResource(podUrl("insurer", ISSUED_PATH), bound, asPointer);
  return (
    <Shell stage={3} page="Evidence of insurance">
      <p className="eyebrow">Covered</p>
      <h1>Evidence of insurance</h1>
      {!bound ? (
        <p className="lede">
          No policy yet. <Link href="/quote">Go to your quote</Link>
        </p>
      ) : (
        <>
          <p className="lede">
            Policy {INSURANCE.policyNumber}, signed by Wrenfield and written once into your pod.
          </p>
          <dl className="terms">
            <div>
              <dt>Mortgagee clause</dt>
              <dd>{INSURANCE.mortgageeClause}</dd>
            </div>
            {pointer.phase === "ok" ? (
              <>
                <div>
                  <dt>Written to</dt>
                  <dd className="mono">{pointer.value.url}</dd>
                </div>
                <div>
                  <dt>Valid from</dt>
                  <dd>{pointer.value.asOf.toISOString().slice(0, 10)}</dd>
                </div>
                <div>
                  <dt>Fingerprint (SHA-256)</dt>
                  <dd className="mono">{pointer.value.sha256.slice(0, 16)}…</dd>
                </div>
              </>
            ) : null}
          </dl>
          <p className="muted">
            Wrenfield keeps this record of what it issued: where it went and its fingerprint, not a
            copy of your data.
          </p>
          <ReadBack />
        </>
      )}
    </Shell>
  );
}
