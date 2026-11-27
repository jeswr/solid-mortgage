// AUTHORED-BY Claude Opus 5.5
/**
 * `/welcome/story/mortgage`: the mortgage demo summarised before it is shown. Six stages, then the
 * same journey from each party's side: what it did, what it saw, and what it never saw.
 */
import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowIcon } from "../components/icons.tsx";
import { demoById } from "../demos.ts";
import { startTourFresh, tourUrl } from "../demos-links.ts";
import { applyMeta } from "../site.ts";
import { MORTGAGE_PERSPECTIVES, MORTGAGE_STAGES } from "../story-mortgage.ts";

export function Story() {
  useEffect(() => applyMeta("Buying a home: the story"), []);
  const demo = demoById("mortgage");
  return (
    <div className="page">
      <div className="page__inner">
        <p className="breadcrumb">
          <Link href="/">All demos</Link>
        </p>
        <header className="page__header">
          <p className="eyebrow">Before you start</p>
          <h1>Buying a home: the story</h1>
          <p className="page__lead">
            Alex Rivera buys 14 Larch Lane for $425,000 with a mortgage. Twelve fictional
            organisations take part. Each asks Alex's pod for what it needs; nobody uploads a
            document.
          </p>
        </header>

        <section className="story-section" aria-labelledby="story-stages">
          <h2 id="story-stages">What happens, in six stages</h2>
          <ol className="story-stages">
            {MORTGAGE_STAGES.map((stage) => (
              <li key={stage.title} className="story-stage">
                <h3>{stage.title}</h3>
                <p>{stage.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="story-section" aria-labelledby="story-eyes">
          <h2 id="story-eyes">Through each party's eyes</h2>
          <p>
            The demo shows everyone at once. Here is the same journey from each side: how little
            each party had to do, and how little each one learned.
          </p>
          <ul className="perspectives">
            {MORTGAGE_PERSPECTIVES.map((party) => (
              <li key={party.name} className="perspective">
                <h3 className="perspective__name">{party.name}</h3>
                <p className="perspective__role">{party.role}</p>
                <dl>
                  <dt>Did</dt>
                  <dd>{party.did}</dd>
                  <dt>Saw</dt>
                  <dd>{party.saw}</dd>
                  <dt>Never saw</dt>
                  <dd>{party.neverSaw}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </section>

        <section className="story-section" aria-labelledby="story-takeaways">
          <h2 id="story-takeaways">What to look for</h2>
          <ul className="story-takeaways">
            <li>
              <strong>One copy.</strong> Alex's data stays in the pod. Organisations read it there
              instead of keeping their own copies.
            </li>
            <li>
              <strong>Granular access.</strong> Each grant names the records, the purpose and the
              end date. A read outside it is refused.
            </li>
            <li>
              <strong>A full audit trail.</strong> The Solid Lens, on the right of every screen,
              logs each read, write and grant. The journey ledger at the end totals them.
            </li>
          </ul>
        </section>

        <p className="watch__try">
          {demo?.tour === undefined ? null : (
            <a
              href={tourUrl(demo.tour)}
              onClick={startTourFresh}
              className="button button--primary"
            >
              Start the guided tour <ArrowIcon />
            </a>
          )}{" "}
          <Link href="/watch/mortgage" className="button button--secondary">
            Watch the video
          </Link>
        </p>
      </div>
    </div>
  );
}
