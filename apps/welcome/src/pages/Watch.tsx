// AUTHORED-BY Claude Opus 5.5
/**
 * `/welcome/watch/<demo>`: one video with its transcript, for sharing and for people who cannot
 * play audio (design.md §e). A demo that is not live yet gets a "Coming next" page.
 */
import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowIcon } from "../components/icons.tsx";
import { VideoPlayer } from "../components/VideoPlayer.tsx";
import type { Demo } from "../demos.ts";
import { startTourFresh, tourUrl } from "../demos-links.ts";
import { formatDuration, isoDuration } from "../format.ts";
import { applyMeta } from "../site.ts";

export function Watch({ demo, probe }: { demo: Demo; probe?: (url: string) => Promise<boolean> }) {
  useEffect(() => applyMeta(`Watch: ${demo.title}`), [demo]);
  // A chapter link from the home page carries #chapter-<id>; scroll there once rendered.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id !== "") document.getElementById(id)?.scrollIntoView();
  }, []);

  const live = demo.status === "live";
  return (
    <div className="page">
      <div className="page__inner">
        <p className="breadcrumb">
          <Link href="/">All demos</Link>
        </p>
        <header className="page__header">
          <p className="eyebrow">{demo.sectors.join(" · ")}</p>
          <h1>{demo.videoTitle}</h1>
          <p className="page__lead">{demo.sentence}</p>
          <p className="page__meta">
            {live ? "Narrated video" : "Planned video"},{" "}
            <time dateTime={isoDuration(demo.durationSeconds)}>
              {formatDuration(demo.durationSeconds)}
            </time>
            {live ? ", with English captions" : null}
          </p>
        </header>

        {live ? (
          <>
            <div className="watch__player">
              <VideoPlayer
                demo={demo}
                idPrefix={`watch-${demo.id}`}
                transcriptHref={(chapter) => `/watch/${demo.id}#chapter-${chapter}`}
                {...(probe === undefined ? {} : { probe })}
              />
            </div>
            {demo.tour === undefined ? null : (
              <p className="watch__try">
                <a
                  href={tourUrl(demo.tour)}
                  onClick={startTourFresh}
                  className="button button--primary"
                >
                  Try it yourself <ArrowIcon />
                </a>
              </p>
            )}
            <section className="transcript" aria-labelledby="transcript-title">
              <h2 id="transcript-title">Transcript</h2>
              {demo.chapters.map((chapter, index) => (
                <section
                  key={chapter.id}
                  id={`chapter-${chapter.id}`}
                  className="transcript__chapter"
                  aria-labelledby={`chapter-${chapter.id}-title`}
                  tabIndex={-1}
                >
                  <h3 id={`chapter-${chapter.id}-title`}>
                    <span className="transcript__number">{index + 1}</span> {chapter.title}
                  </h3>
                  {chapter.transcript.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </section>
          </>
        ) : (
          <section className="coming" aria-labelledby="coming-title">
            <span className="badge badge--coming">Coming next</span>
            <h2 id="coming-title">This demo is being built</h2>
            <p>
              Its video, transcript and guided tour will appear here when it is ready. It will
              cover:
            </p>
            <ol className="coming__chapters">
              {demo.chapters.map((chapter) => (
                <li key={chapter.id}>{chapter.title}</li>
              ))}
            </ol>
            <p>
              <Link href="/">Back to all demos</Link>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
