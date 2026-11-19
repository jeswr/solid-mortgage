// AUTHORED-BY Claude Opus 5.5
/** Closing appointment: when and where, and what the Closing Disclosure says to bring. */
import { DAY } from "@mortgage/content/mortgage/facts";
import { ORGS } from "@mortgage/content/orgs";
import { earliestConsummationAfterClosingDisclosure, isoDate } from "@mortgage/demo-kit/calendar";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { Link } from "wouter";
import { Failure, Loading } from "../components.tsx";
import { org } from "../org.ts";
import { loadDisclosures } from "../pod.ts";
import { calendar, worldOn } from "../runtime.ts";
import { usePod } from "../usePod.ts";
import { demoDate, usd } from "../view.ts";

export function ClosingPage() {
  useEffect(() => applyDocumentMeta(org, "Closing"), []);
  const [state] = usePod(() => loadDisclosures(worldOn(DAY.closing)));
  const closing = state.status === "ready" ? state.value.closing : undefined;
  return (
    <>
      <section className="intro">
        <p className="eyebrow">Closing appointment</p>
        <h1>Signing day</h1>
        <p className="lede">
          {ORGS.title.organisation}, the settlement agent, runs the signing. The signing in this
          demo is simulated.
        </p>
      </section>
      {state.status === "loading" ? <Loading label="Reading your Closing Disclosure…" /> : null}
      {state.status === "error" ? <Failure error={state.error} /> : null}
      {state.status === "ready" ? (
        <section className="panel" aria-labelledby="appointment-heading">
          <h2 id="appointment-heading">Your appointment</h2>
          {closing === undefined ? (
            <p>
              The appointment is set once your Closing Disclosure is issued.{" "}
              <Link href="/disclosures">See your disclosures</Link>.
            </p>
          ) : (
            <dl className="facts">
              <div>
                <dt>Date</dt>
                <dd>{demoDate(calendar(), closing.closingDate)}</dd>
              </div>
              <div>
                <dt>With</dt>
                <dd>{ORGS.title.organisation}</dd>
              </div>
              <div>
                <dt>Cash to close</dt>
                <dd>{usd(closing.cashToCloseUsd)}</dd>
              </div>
              <div>
                <dt>Bring</dt>
                <dd>A photo ID. Funds arrive by wire before the appointment.</dd>
              </div>
              {closing.receivedDate === undefined ? (
                <div>
                  <dt>Before then</dt>
                  <dd>
                    <Link href="/disclosures">Confirm you received the Closing Disclosure</Link>
                  </dd>
                </div>
              ) : (
                <div>
                  <dt>Earliest possible closing</dt>
                  <dd>
                    {demoDate(
                      calendar(),
                      earliestConsummationAfterClosingDisclosure(isoDate(closing.receivedDate)),
                    )}
                  </dd>
                </div>
              )}
            </dl>
          )}
          <p className="fine">A purchase loan has no three-day right to cancel after signing.</p>
        </section>
      ) : null}
    </>
  );
}
