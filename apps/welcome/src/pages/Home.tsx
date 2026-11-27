// AUTHORED-BY Claude Opus 5.5
/** The front door (design.md §e), sections in the specified order. */

import { appUrl } from "@mortgage/demo-kit/urls";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link } from "wouter";
import { DemoCard } from "../components/DemoCard.tsx";
import {
  CheckIcon,
  ExternalIcon,
  HomeIcon,
  MaskIcon,
  MoveIcon,
  PillIcon,
  ShieldIcon,
} from "../components/icons.tsx";
import { Launcher } from "../components/Launcher.tsx";
import { PodDiagram } from "../components/PodDiagram.tsx";
import { ADOPTION_LEAD, EXPLAINER, HEADLINE, PRIMER, REAL, SIMULATED } from "../copy.ts";
import { type Demo, demoById, demosOfScale } from "../demos.ts";
import { guidedDemo, startTourFresh, tourUrl } from "../demos-links.ts";
import { applyMeta, CONVENER, LINKS } from "../site.ts";

/**
 * The adoption path (design.md §e item 3, reworked after member feedback): build the pieces for
 * one high-value journey, then reuse the same pod for single interactions and new sectors.
 */
const ADOPTION_PATH: ReadonlyArray<{
  label: string;
  sector: string;
  demo: string;
  icon: ReactNode;
  note: string;
}> = [
  {
    label: "Build it for the mortgage",
    sector: "Finance",
    demo: "mortgage",
    icon: <HomeIcon />,
    note: "Pods, grants, credentials and audit, in one journey",
  },
  {
    label: "Reuse it when the customer moves",
    sector: "Government",
    demo: "moving-house",
    icon: <MoveIcon />,
    note: "The same pod; one address, changed once",
  },
  {
    label: "Reuse it for a claim",
    sector: "Insurance",
    demo: "motor-claim",
    icon: <ShieldIcon />,
    note: "Each party sees only its part of the claim",
  },
  {
    label: "Extend it to new sectors",
    sector: "Healthcare",
    demo: "medication-handover",
    icon: <PillIcon />,
    note: "Further out: one medication list, three writers",
  },
];

export function Home({ probe }: { probe?: (url: string) => Promise<boolean> }) {
  useEffect(() => applyMeta(), []);
  const flagship = demoById("mortgage");
  const guided = guidedDemo(window.location.search) !== undefined;
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__inner">
          <div className="hero__copy">
            <p className="eyebrow eyebrow--on-dark">Convened by the {CONVENER}</p>
            <h1 id="hero-title" className="hero__title">
              {HEADLINE}
            </h1>
            <p className="hero__explainer">{EXPLAINER}</p>
            <div className="hero__actions">
              {guided ? (
                // Step 1 of the guided tour: Start opens Alex's wallet, which reads Alex's pod.
                <>
                  <a
                    href={appUrl("wallet")}
                    data-tour="tour-start"
                    className="button button--light"
                  >
                    Start
                  </a>
                  <Link href="/story/mortgage" className="button button--ghost-light">
                    Read the story first
                  </Link>
                </>
              ) : (
                <a href="#demos" className="button button--light">
                  See the demos
                </a>
              )}
              {guided || flagship?.tour === undefined ? null : (
                <a
                  href={tourUrl(flagship.tour)}
                  onClick={startTourFresh}
                  className="button button--ghost-light"
                >
                  Try the mortgage demo
                </a>
              )}
            </div>
          </div>
          <div className="hero__figure">
            <PodDiagram />
          </div>
        </div>
      </section>

      <section className="section" id="solid" aria-labelledby="solid-title">
        <div className="section__inner">
          <header className="section__header">
            <p className="eyebrow">New to Solid?</p>
            <h2 id="solid-title">Four ideas the demos rely on</h2>
          </header>
          <dl className="primer">
            {PRIMER.map((item) => (
              <div key={item.term} className="primer__item">
                <dt>{item.term}</dt>
                <dd>{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section" id="demos" aria-labelledby="demos-title">
        <div className="section__inner">
          <header className="section__header">
            <p className="eyebrow">Demos</p>
            <h2 id="demos-title">Start small, then see a whole journey</h2>
            <p className="section__lead">
              Each demo runs a real process with fictional organisations, against pods in your
              browser. Watch the narrated video, or take the guided tour yourself.
            </p>
          </header>
          <DemoGroup
            id="single"
            title="Single interactions"
            lead="One customer, one or two organisations, a minute or two each. Start here if Solid is new to you."
            demos={demosOfScale("single")}
            probe={probe}
          />
          <DemoGroup
            id="journeys"
            title="Whole journeys"
            lead="Many organisations, one pod, from first request to last. The mortgage is the fullest of them."
            demos={demosOfScale("journey")}
            probe={probe}
          />
        </div>
      </section>

      <section className="section section--band" id="adoption" aria-labelledby="adoption-title">
        <div className="section__inner">
          <header className="section__header">
            <p className="eyebrow">Adoption</p>
            <h2 id="adoption-title">Build it once for the mortgage, reuse it everywhere</h2>
            <p className="section__lead">{ADOPTION_LEAD}</p>
          </header>
          <ol className="sector-strip">
            {ADOPTION_PATH.map((item) => (
              <li key={item.label} className="sector-strip__item">
                <a href={`#demo-${item.demo}`} className="sector-strip__link">
                  <span className="sector-strip__icon">{item.icon}</span>
                  <span className="sector-strip__label">{item.label}</span>
                  <span className="sector-strip__sector">{item.sector}</span>
                  <span className="sector-strip__note">{item.note}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="apps" aria-labelledby="apps-title">
        <div className="section__inner">
          <header className="section__header">
            <p className="eyebrow">Free play</p>
            <h2 id="apps-title">Explore the apps</h2>
            <p className="section__lead">
              Thirteen applications from twelve fictional organisations, each with its own design.
              Open any of them without the tour; the Solid Lens shows every request it makes.
            </p>
          </header>
          <Launcher />
        </div>
      </section>

      <section className="section section--band" id="real" aria-labelledby="real-title">
        <div className="section__inner">
          <header className="section__header">
            <p className="eyebrow">Honesty</p>
            <h2 id="real-title">What is real and what is simulated</h2>
          </header>
          <div className="real-grid">
            <div className="real-col real-col--real">
              <h3 className="real-col__title">
                <CheckIcon /> Real
              </h3>
              <ul>
                {REAL.map((line) => (
                  <li key={line.title}>
                    <strong>{line.title}.</strong> {line.body}
                  </li>
                ))}
              </ul>
            </div>
            <div className="real-col real-col--simulated">
              <h3 className="real-col__title">
                <MaskIcon /> Simulated
              </h3>
              <ul>
                {SIMULATED.map((line) => (
                  <li key={line.title}>
                    <strong>{line.title}.</strong> {line.body}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="section__more">
            <Link href="/honesty">The full account of what is real and what is simulated</Link>
          </p>
        </div>
      </section>

      <section className="section join" id="join" aria-labelledby="join-title">
        <div className="section__inner join__inner">
          <div>
            <p className="eyebrow eyebrow--on-dark">Join in</p>
            <h2 id="join-title">Help shape what comes next</h2>
            <p className="join__lead">
              The {CONVENER} meets every week to review these demos, choose the next process to
              model and agree the shared vocabularies they use. Bring a process you run.
            </p>
          </div>
          <div className="join__actions">
            <a href={LINKS.meeting} className="button button--light" rel="noopener">
              Register for the weekly meeting <ExternalIcon />
            </a>
            <a href={LINKS.forum} className="button button--ghost-light" rel="noopener">
              Join the forum <ExternalIcon />
            </a>
            <a
              href={appUrl("feedback", "", { from: "welcome" })}
              className="button button--ghost-light"
            >
              Give feedback on the demos
            </a>
            <a href={LINKS.source} className="join__source" rel="noopener">
              Read the source code on GitHub
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function DemoGroup({
  id,
  title,
  lead,
  demos,
  probe,
}: {
  id: string;
  title: string;
  lead: string;
  demos: readonly Demo[];
  probe: ((url: string) => Promise<boolean>) | undefined;
}) {
  return (
    <section className="demo-group" id={`demos-${id}`} aria-labelledby={`demos-${id}-title`}>
      <h3 id={`demos-${id}-title`} className="demo-group__title">
        {title}
      </h3>
      <p className="demo-group__lead">{lead}</p>
      <ul className="demo-list" aria-label={title}>
        {demos.map((demo) => (
          <li
            key={demo.id}
            className={demo.status === "live" ? "demo-list__live" : "demo-list__coming"}
          >
            <DemoCard demo={demo} {...(probe === undefined ? {} : { probe })} />
          </li>
        ))}
      </ul>
    </section>
  );
}
