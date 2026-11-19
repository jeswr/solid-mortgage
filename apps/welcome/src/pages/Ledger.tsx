// AUTHORED-BY Claude Opus 5.5
/**
 * `/welcome/ledger`: the journey ledger page (design.md §c.5). The ledger itself is the
 * `<journey-ledger>` element from @mortgage/lens; this page owns only the frame around it and the
 * calls to action.
 */
import { useEffect } from "react";
import { Link } from "wouter";
import { ExternalIcon } from "../components/icons.tsx";
import { homeSection } from "../components/Layout.tsx";
import { DEMOS } from "../demos.ts";
import { tourUrl } from "../demos-links.ts";
import { applyMeta, LINKS } from "../site.ts";

export function Ledger() {
  useEffect(() => applyMeta("Journey ledger"), []);
  const flagship = DEMOS.find((demo) => demo.tour !== undefined);
  return (
    <div className="page">
      <div className="page__inner">
        <p className="breadcrumb">
          <Link href="/">All demos</Link>
        </p>
        <header className="page__header">
          <p className="eyebrow">End of the journey</p>
          <h1>Journey ledger</h1>
          <p className="page__lead">
            Every organisation, every record, every grant, and what each one never saw: counted from
            the pod's own log in this browser, never typed in.
          </p>
        </header>

        {/*
          MOUNT POINT: the journey ledger from @mortgage/lens (`<journey-ledger>`, lane L2) renders
          inside this element, replacing the placeholder. Mount it here and nowhere else; the
          frame, heading and calls to action stay owned by this page.
        */}
        <div id="journey-ledger" className="ledger-mount" data-journey-ledger-mount="">
          <div className="ledger-mount__placeholder">
            <p className="ledger-mount__title">The ledger appears here after you run a demo.</p>
            <p>
              Run the guided tour in this browser, and this page will show who read what, under
              which grant, and what never left the pod.
            </p>
          </div>
        </div>

        <section className="cta-row" aria-labelledby="ledger-next">
          <h2 id="ledger-next" className="visually-hidden">
            What next
          </h2>
          <ul>
            {flagship?.tour === undefined ? null : (
              <li>
                <a href={tourUrl(flagship.tour)} className="button button--primary">
                  Start the mortgage demo again
                </a>
              </li>
            )}
            <li>
              <a href={homeSection("demos")} className="button button--secondary">
                Watch the other demos
              </a>
            </li>
            <li>
              <a href={LINKS.meeting} className="button button--secondary" rel="noopener">
                Register for the weekly meeting <ExternalIcon />
              </a>
            </li>
            <li>
              <a href={LINKS.forum} className="button button--secondary" rel="noopener">
                Join the forum <ExternalIcon />
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
