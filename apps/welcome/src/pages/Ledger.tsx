// AUTHORED-BY Claude Opus 5.5
/**
 * `/welcome/journey`: the journey ledger page (design.md §c.5, the tour's last step and the Lens's
 * ledger link). The ledger itself is the `<journey-ledger>` element from @mortgage/lens, fed from
 * the pods' request log in this browser; this page owns only the frame around it and the calls to
 * action. `/welcome/ledger` redirects here.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ExternalIcon } from "../components/icons.tsx";
import { homeSection } from "../components/Layout.tsx";
import { DEMOS } from "../demos.ts";
import { startTourFresh, tourUrl } from "../demos-links.ts";
import type { GrantOnRecord } from "../guided-tour.ts";
import { applyMeta, LINKS } from "../site.ts";

const STATE_WORDS: Readonly<Record<GrantOnRecord["state"], string>> = {
  active: "Active",
  expired: "Expired",
  revoked: "Withdrawn",
};

export function Ledger() {
  useEffect(() => applyMeta("Journey ledger"), []);
  const flagship = DEMOS.find((demo) => demo.tour !== undefined);
  const ledgerRef = useRef<HTMLDivElement>(null);
  const [hasEntries, setHasEntries] = useState(false);
  const [grants, setGrants] = useState<readonly GrantOnRecord[]>([]);
  useEffect(() => {
    const mount = ledgerRef.current;
    if (mount === null) return;
    let live = true;
    let stop: (() => void) | undefined;
    const pods = import("../guided-tour.ts");
    pods
      .then((loaded) => loaded.readGrantsOnRecord())
      .then((records) => live && setGrants(records))
      .catch((error: unknown) =>
        console.error("welcome: the grants on record did not load", error),
      );
    pods
      .then((loaded) => loaded.mountJourneyLedger(mount, (has) => live && setHasEntries(has)))
      .then((unmount) => {
        if (live) stop = unmount;
        else unmount();
      })
      .catch((error: unknown) => console.error("welcome: the journey ledger did not load", error));
    return () => {
      live = false;
      stop?.();
    };
  }, []);
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

        {/* The journey ledger renders into the inner element; the tour's last step points here. */}
        <div
          id="journey-ledger"
          className="ledger-mount"
          data-journey-ledger-mount=""
          data-tour="journey-ledger"
        >
          {hasEntries ? null : (
            <div className="ledger-mount__placeholder">
              <p className="ledger-mount__title">The ledger appears here after you run a demo.</p>
              <p>
                Run the guided tour in this browser, and this page will show who read what, under
                which grant, and what never left the pod.
              </p>
            </div>
          )}
          <div ref={ledgerRef} />
        </div>

        {grants.length === 0 ? null : (
          <section className="grants-on-record" aria-labelledby="grants-on-record">
            <h2 id="grants-on-record">Grants on record in Alex's pod</h2>
            <p>
              Read from the agreements in Alex's policies drawer and the latest consent record for
              each, not from the log.
            </p>
            <table>
              <thead>
                <tr>
                  <th scope="col">Grant</th>
                  <th scope="col">Given to</th>
                  <th scope="col">For</th>
                  <th scope="col">State</th>
                  <th scope="col">Since</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.code} data-grant={grant.code} data-state={grant.state}>
                    <th scope="row">{grant.code}</th>
                    <td>{grant.to}</td>
                    <td>{grant.name}</td>
                    <td>{STATE_WORDS[grant.state]}</td>
                    <td>{grant.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="cta-row" aria-labelledby="ledger-next">
          <h2 id="ledger-next" className="visually-hidden">
            What next
          </h2>
          <ul>
            {flagship?.tour === undefined ? null : (
              <li>
                <a
                  href={tourUrl(flagship.tour)}
                  onClick={startTourFresh}
                  className="button button--primary"
                >
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
