// AUTHORED-BY Claude Opus 5.5
/**
 * Start: "Apply with your pod" or "Fill in by hand". Applying with the pod asks Alex for access
 * (an access request appended to Alex's inbox) and hands over to Alex's wallet, which returns
 * here once Alex has decided (design.md §d.4).
 */

import { DAY } from "@mortgage/content/mortgage/facts";
import { requestApplicationAccess } from "@mortgage/content/mortgage/journey";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Failure, Loading, Refusal } from "../components.tsx";
import { org } from "../org.ts";
import { isSubmitted, refusalOf } from "../pod.ts";
import { act, worldOn } from "../runtime.ts";
import { usePod } from "../usePod.ts";

type Asking = { kind: "idle" } | { kind: "busy" } | { kind: "failed"; error: unknown };

export function StartPage() {
  useEffect(() => applyDocumentMeta(org), []);
  const [submitted] = usePod(() => isSubmitted(worldOn(DAY.application)));
  const [asking, setAsking] = useState<Asking>({ kind: "idle" });

  async function applyWithPod() {
    setAsking({ kind: "busy" });
    try {
      const request = await act(DAY.application, requestApplicationAccess);
      window.location.assign(
        appUrl("wallet", "/requests", { request, return: appUrl("lender", "/application") }),
      );
    } catch (error) {
      setAsking({ error, kind: "failed" });
    }
  }

  const refused = asking.kind === "failed" ? refusalOf(asking.error) : undefined;
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Purchase loan · 14 Larch Lane</p>
        <h1>Your home loan, filled in from your pod</h1>
        <p className="lede">
          Juniper asks your pod for the few things an application needs. You see exactly what, why
          and until when, and you decide. Nothing is copied into Juniper's systems that you have not
          agreed to.
        </p>
      </section>
      {submitted.status === "loading" ? <Loading label="Checking your loan file…" /> : null}
      {submitted.status === "ready" && submitted.value ? (
        <section className="panel panel-accent">
          <h2>Your application is in</h2>
          <p>
            Loan JHL-1001 is on file. <Link href="/status">See where it stands</Link> or{" "}
            <Link href="/disclosures">read your disclosures</Link>.
          </p>
        </section>
      ) : null}
      <div className="choices">
        <section className="choice choice-primary" aria-labelledby="pod-heading">
          <h2 id="pod-heading">Apply with your pod</h2>
          <p>
            We ask to read your identity, income, accounts, credit summary and property details, and
            name our underwriting service. Your wallet shows the request; you approve or decline
            there.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={applyWithPod}
            disabled={asking.kind === "busy"}
          >
            {asking.kind === "busy" ? "Asking your pod…" : "Apply with your pod"}
          </button>
          <p className="fine">You will go to Cairn, your pod's wallet, and come back here.</p>
        </section>
        <section className="choice" aria-labelledby="hand-heading">
          <h2 id="hand-heading">Fill in by hand</h2>
          <p>Type everything in and upload payslips, statements and your contract.</p>
          <Link href="/manual" className="button button-quiet">
            See what that takes
          </Link>
        </section>
      </div>
      {refused?.kind === "refused" ? <Refusal {...refused} /> : null}
      {asking.kind === "failed" && refused === undefined ? (
        <Failure
          error={asking.error instanceof Error ? asking.error : new Error(String(asking.error))}
        />
      ) : null}
      {submitted.status === "error" ? <Failure error={submitted.error} /> : null}
    </>
  );
}
