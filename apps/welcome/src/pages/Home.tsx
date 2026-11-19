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
import { EXPLAINER, HEADLINE, REAL, SIMULATED } from "../copy.ts";
import { DEMOS, demoById } from "../demos.ts";
import { guidedDemo, startTourFresh, tourUrl } from "../demos-links.ts";
import { applyMeta, CONVENER, LINKS } from "../site.ts";

/** design.md §e item 3: one pod, four sectors, each pointing at the demo card that shows it. */
const SECTOR_STRIP: ReadonlyArray<{
  label: string;
  sector: string;
  demo: string;
  icon: ReactNode;
  note: string;
}> = [
  {
    label: "Buy a home",
    sector: "Finance",
    demo: "mortgage",
    icon: <HomeIcon />,
    note: "Twelve organisations, one pod",
  },
  {
    label: "Insure it",
    sector: "Insurance",
    demo: "mortgage",
    icon: <ShieldIcon />,
    note: "Quoted from facts already in the pod",
  },
  {
    label: "Tell everyone you moved",
    sector: "Government",
    demo: "moving-house",
    icon: <MoveIcon />,
    note: "One address, changed once",
  },
  {
    label: "Hand over a medication list",
    sector: "Healthcare",
    demo: "medication-handover",
    icon: <PillIcon />,
    note: "One list, three writers",
  },
];

export function Home({ probe }: { probe?: (url: string) => Promise<boolean> }) {
  useEffect(() => applyMeta(), []);
  const flagship = DEMOS.find((demo) => demo.status === "live" && demo.tour !== undefined);
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
                <a href={appUrl("wallet")} data-tour="tour-start" className="button button--light">
                  Start
                </a>
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

      <section className="section" id="demos" aria-labelledby="demos-title">
        <div className="section__inner">
          <header className="section__header">
            <p className="eyebrow">Demos</p>
            <h2 id="demos-title">Watch one, then run it yourself</h2>
            <p className="section__lead">
              Each demo is a real process run by fictional organisations against pods in your
              browser. Watch the narrated video, or take the guided tour with fresh data.
            </p>
          </header>
          <ul className="demo-list" aria-label="Demos">
            {DEMOS.map((demo) => (
              <li
                key={demo.id}
                className={demo.status === "live" ? "demo-list__live" : "demo-list__coming"}
              >
                <DemoCard demo={demo} {...(probe === undefined ? {} : { probe })} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--band" id="sectors" aria-labelledby="sectors-title">
        <div className="section__inner">
          <header className="section__header">
            <p className="eyebrow">The connected story</p>
            <h2 id="sectors-title">One pod, four sectors</h2>
            <p className="section__lead">
              The same person's pod serves a lender, an insurer, a state agency and a pharmacy. Each
              reads what it was granted, and nothing else.
            </p>
          </header>
          <ol className="sector-strip">
            {SECTOR_STRIP.map((item) => {
              const demo = demoById(item.demo);
              const live = demo?.status === "live";
              return (
                <li key={item.label} className="sector-strip__item">
                  <a href={`#demo-${item.demo}`} className="sector-strip__link">
                    <span className="sector-strip__icon">{item.icon}</span>
                    <span className="sector-strip__label">{item.label}</span>
                    <span className="sector-strip__sector">{item.sector}</span>
                    <span className="sector-strip__note">{item.note}</span>
                    <span className={live ? "badge badge--live" : "badge badge--coming"}>
                      {live ? "In the mortgage demo" : "Coming next"}
                    </span>
                  </a>
                </li>
              );
            })}
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
            <a href={LINKS.source} className="join__source" rel="noopener">
              Read the source code on GitHub
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
