// AUTHORED-BY Claude Opus 5.5
/**
 * One demo on the welcome page (design.md §e item 2). A live demo plays its video in place and
 * offers Watch and Try it yourself; a coming demo says so and links nowhere.
 */
import { Link } from "wouter";
import type { Demo } from "../demos.ts";
import { startTourFresh, tourUrl } from "../demos-links.ts";
import { formatDuration, isoDuration } from "../format.ts";
import { Framing, Parties } from "./Framing.tsx";
import { ArrowIcon } from "./icons.tsx";
import { VideoPlayer } from "./VideoPlayer.tsx";

export interface DemoCardProps {
  demo: Demo;
  probe?: (url: string) => Promise<boolean>;
}

export function DemoCard({ demo, probe }: DemoCardProps) {
  const headingId = `demo-${demo.id}-title`;
  if (demo.status === "coming") {
    return (
      <article
        className="demo-card demo-card--coming"
        id={`demo-${demo.id}`}
        aria-labelledby={headingId}
      >
        <div className="demo-card__meta">
          <span className="badge badge--coming">Coming next</span>
          <Sectors demo={demo} />
        </div>
        <h3 id={headingId} className="demo-card__title">
          {demo.title}
        </h3>
        <p className="demo-card__sentence">{demo.sentence}</p>
        <p className="demo-card__duration">
          Video about{" "}
          <time dateTime={isoDuration(demo.durationSeconds)}>
            {formatDuration(demo.durationSeconds)}
          </time>
        </p>
      </article>
    );
  }
  return (
    <article
      className="demo-card demo-card--live"
      id={`demo-${demo.id}`}
      aria-labelledby={headingId}
    >
      <div className="demo-card__media">
        <VideoPlayer
          demo={demo}
          idPrefix={`card-${demo.id}`}
          transcriptHref={(chapter) => `/watch/${demo.id}#chapter-${chapter}`}
          {...(probe === undefined ? {} : { probe })}
        />
      </div>
      <div className="demo-card__body">
        <div className="demo-card__meta">
          <span className="badge badge--live">Live demo</span>
          <Sectors demo={demo} />
        </div>
        <h3 id={headingId} className="demo-card__title">
          {demo.title}
        </h3>
        <p className="demo-card__video-title">{demo.videoTitle}</p>
        <Framing demo={demo} />
        <p className="demo-card__sentence">{demo.sentence}</p>
        <Parties demo={demo} />
        <p className="demo-card__duration">
          Narrated video,{" "}
          <time dateTime={isoDuration(demo.durationSeconds)}>
            {formatDuration(demo.durationSeconds)}
          </time>
          , with captions and a transcript
        </p>
        <div className="demo-card__actions">
          {demo.story === undefined ? null : (
            <Link href={demo.story} className="button button--secondary">
              Read the story first<span className="visually-hidden">: {demo.title}</span>
            </Link>
          )}
          <Link href={`/watch/${demo.id}`} className="button button--secondary">
            Watch<span className="visually-hidden"> the {demo.title} video</span>
          </Link>
          {demo.tour === undefined ? null : (
            <a
              href={tourUrl(demo.tour)}
              onClick={startTourFresh}
              className="button button--primary"
            >
              Try it yourself<span className="visually-hidden">: {demo.title}</span> <ArrowIcon />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function Sectors({ demo }: { demo: Demo }) {
  return (
    <ul className="sectors" aria-label="Sectors">
      {demo.sectors.map((sector) => (
        <li key={sector} className={`sector sector--${sector.toLowerCase()}`}>
          {sector}
        </li>
      ))}
    </ul>
  );
}
