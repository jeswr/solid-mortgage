// AUTHORED-BY Claude Opus 5.5
/**
 * `/welcome/honesty`: what is real and what is simulated. Every trust banner's "About this demo"
 * link lands here (`HONESTY_PATH` in demo-kit). It also reports what this browser is doing.
 */
import { ORGS } from "@mortgage/content/orgs";
import { displayName, ORG_SLUGS } from "@mortgage/demo-kit/registry";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { HONESTY_STATEMENT, REAL, SIMULATED } from "../copy.ts";
import { applyMeta, CONVENER } from "../site.ts";

type RuntimeMode = "checking" | "service-worker" | "registered" | "not-started" | "unsupported";

/** Which mode the in-browser pods are in, as far as this page can see. */
export async function detectRuntimeMode(nav: Navigator = navigator): Promise<RuntimeMode> {
  if (!("serviceWorker" in nav)) return "unsupported";
  const controller = nav.serviceWorker.controller;
  if (controller?.scriptURL.endsWith("/pods-sw.js")) return "service-worker";
  try {
    const registrations = await nav.serviceWorker.getRegistrations();
    if (registrations.some((r) => r.active?.scriptURL.endsWith("/pods-sw.js"))) return "registered";
  } catch {
    // Some private modes refuse to list registrations; treat as not started.
  }
  return "not-started";
}

const MODE_TEXT: Record<RuntimeMode, string> = {
  checking: "Checking this browser…",
  "service-worker":
    "The pods are running in a service worker in this browser, and this page is connected to it.",
  registered:
    "The pods' service worker is installed in this browser. Open any demo app to connect to it.",
  "not-started":
    "The pods have not started in this browser yet. They start when you open a demo app.",
  unsupported:
    "This browser does not offer service workers here, so the apps run the same pod server in a dedicated worker and rebuild it from a journal on each page.",
};

export function Honesty() {
  useEffect(() => applyMeta("What is real and what is simulated"), []);
  const [mode, setMode] = useState<RuntimeMode>("checking");
  useEffect(() => {
    let current = true;
    detectRuntimeMode().then(
      (found) => current && setMode(found),
      () => current && setMode("not-started"),
    );
    return () => {
      current = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="page__inner page__inner--narrow">
        <p className="breadcrumb">
          <Link href="/">All demos</Link>
        </p>
        <header className="page__header">
          <p className="eyebrow">About these demos</p>
          <h1>What is real and what is simulated</h1>
          <p className="page__lead honesty__statement">{HONESTY_STATEMENT}</p>
        </header>

        <section aria-labelledby="real-heading" className="prose">
          <h2 id="real-heading">Real</h2>
          <ul>
            {REAL.map((line) => (
              <li key={line.title}>
                <strong>{line.title}.</strong> {line.body}
              </li>
            ))}
            <li>
              <strong>Real Solid HTTP.</strong> The apps read and write the pods with ordinary Solid
              requests. Pointing them at a hosted pod with real Solid-OIDC sign-in is a later
              option, not part of this build.
            </li>
          </ul>
        </section>

        <section aria-labelledby="simulated-heading" className="prose">
          <h2 id="simulated-heading">Simulated</h2>
          <ul>
            {SIMULATED.map((line) => (
              <li key={line.title}>
                <strong>{line.title}.</strong> {line.body}
              </li>
            ))}
            <li>
              <strong>Simulated dates.</strong> A demo calendar places every step on a real past
              date, so regulatory clocks such as the three business days for a Loan Estimate can be
              shown without fake timestamps.
            </li>
            <li>
              <strong>Simulated back offices.</strong> When one organisation reacts while you look
              at another, a small program in your browser stands in for its back office.
            </li>
          </ul>
        </section>

        <section aria-labelledby="browser-heading" className="prose">
          <h2 id="browser-heading">In this browser</h2>
          <p className="runtime-status" aria-live="polite" data-runtime-mode={mode}>
            {MODE_TEXT[mode]}
          </p>
          <p>
            To start again, use Restart in any app's Solid Lens, or clear this site's data in your
            browser settings.
          </p>
        </section>

        <section aria-labelledby="orgs-heading" className="prose">
          <h2 id="orgs-heading">Every organisation is fictional</h2>
          <p>
            The organisations illustrate market roles only. None of them exists, none built these
            demos, and none is affiliated with or endorses them. The demos were built by the{" "}
            {CONVENER}.
          </p>
          <div className="table-wrap">
            <table className="org-table">
              <caption className="visually-hidden">Fictional organisations and their roles</caption>
              <thead>
                <tr>
                  <th scope="col">Organisation</th>
                  <th scope="col">Role in the demos</th>
                </tr>
              </thead>
              <tbody>
                {ORG_SLUGS.map((slug) => (
                  <tr key={slug}>
                    <th scope="row">
                      <span
                        className="org-table__swatch"
                        style={{ background: ORGS[slug].themeColor }}
                        aria-hidden="true"
                      />
                      {displayName(ORGS[slug])}
                    </th>
                    <td>{ORGS[slug].role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
