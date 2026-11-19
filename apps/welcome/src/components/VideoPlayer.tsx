// AUTHORED-BY Claude Opus 5.5
/**
 * A self-hosted narrated video that plays in place of its poster (design.md §e item 2): MP4 with
 * WebVTT captions, `preload="none"` so nothing is fetched until the visitor asks, and a chapter
 * list that seeks. Before a recording is published the poster says "Video coming soon" and the
 * chapter list points at the transcript instead of offering controls that would do nothing.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import type { Demo } from "../demos.ts";
import { formatClock, formatDuration } from "../format.ts";
import { PlayIcon } from "./icons.tsx";

/** Start playback; a refused autoplay leaves the native controls for the visitor to press. */
function startPlayback(video: HTMLVideoElement): void {
  try {
    const started: Promise<void> | undefined = video.play();
    started?.catch(() => undefined);
  } catch {
    // Not playable here (no media support): the poster and transcript remain.
  }
}

export type Availability = "checking" | "available" | "missing" | "failed";

/** Whether the recording exists: a HEAD request that must answer 2xx with a video type. */
export async function probeVideo(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok && (response.headers.get("content-type") ?? "").startsWith("video/");
  } catch {
    return false;
  }
}

function useAvailability(demo: Demo, probe: (url: string) => Promise<boolean>): Availability {
  const [state, setState] = useState<Availability>(demo.status === "live" ? "checking" : "missing");
  useEffect(() => {
    if (demo.status !== "live") {
      setState("missing");
      return;
    }
    let current = true;
    setState("checking");
    probe(demo.media.video).then(
      (ok) => current && setState(ok ? "available" : "missing"),
      () => current && setState("missing"),
    );
    return () => {
      current = false;
    };
  }, [demo, probe]);
  return state;
}

/**
 * Whether `element` is on screen or within `margin` of it. Native `loading="lazy"` fetches images
 * well below the fold (Chrome starts 1250 to 2500 px early), so a page of cards would download
 * every poster on arrival; the welcome page's first load holds to acceptance test 15's budget by
 * asking for a poster only as its card comes near. Without IntersectionObserver it is always true.
 */
function useNearViewport<T extends Element>(
  margin = "200px",
): [(element: T | null) => void, boolean] {
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");
  const observer = useRef<IntersectionObserver | null>(null);
  const ref = useCallback(
    (element: T | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (element === null || near) return;
      const watch = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setNear(true);
            watch.disconnect();
          }
        },
        { rootMargin: margin },
      );
      watch.observe(element);
      observer.current = watch;
    },
    [margin, near],
  );
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, near];
}

export interface VideoPlayerProps {
  demo: Demo;
  /** Where chapter titles link while there is no video: the watch page's transcript anchors. */
  transcriptHref: (chapterId: string) => string;
  /** Overrides the existence check (tests). */
  probe?: (url: string) => Promise<boolean>;
  /** Heading id the chapter list is labelled from. */
  idPrefix: string;
}

export function VideoPlayer({
  demo,
  transcriptHref,
  probe = probeVideo,
  idPrefix,
}: VideoPlayerProps) {
  const [failed, setFailed] = useState(false);
  const probed = useAvailability(demo, probe);
  const availability: Availability = failed ? "failed" : probed;
  const [open, setOpen] = useState(false);
  const [starts, setStarts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      demo.chapters.flatMap((c) => (c.start === undefined ? [] : [[c.id, c.start] as const])),
    ),
  );
  const [cuesSettled, setCuesSettled] = useState(false);
  const [metadataReady, setMetadataReady] = useState(false);
  /** The chapter to seek to once the video can seek; "" means the beginning. */
  const pending = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chapterTrackRef = useRef<HTMLTrackElement>(null);

  const seekPending = useCallback(() => {
    const video = videoRef.current;
    const target = pending.current;
    if (video === null || target === null) return;
    // With preload="none" nothing loads until playback starts, so start it before seeking.
    if (video.paused) startPlayback(video);
    if (target === "") {
      pending.current = null;
      return;
    }
    const at = starts[target];
    if (!metadataReady || (at === undefined && !cuesSettled)) return;
    pending.current = null;
    if (at !== undefined) video.currentTime = at;
  }, [starts, cuesSettled, metadataReady]);

  useEffect(() => {
    if (open) seekPending();
  }, [open, seekPending]);

  // Load the chapter cues (a chapters track is disabled, so unloaded, until asked for).
  useEffect(() => {
    if (!open) return;
    const element = chapterTrackRef.current;
    if (element === null) return;
    const settle = () => {
      const cues = element.track?.cues ?? null;
      if (cues !== null && cues.length > 0) {
        const found: Record<string, number> = {};
        for (let i = 0; i < cues.length; i++) {
          const cue = cues[i];
          if (cue === undefined) continue;
          const byId = demo.chapters.find((c) => c.id === cue.id);
          const chapter = byId ?? demo.chapters[i];
          if (chapter !== undefined && found[chapter.id] === undefined)
            found[chapter.id] = cue.startTime;
        }
        setStarts((known) => ({ ...found, ...known }));
      }
      setCuesSettled(true);
    };
    const giveUp = () => setCuesSettled(true);
    element.addEventListener("load", settle);
    element.addEventListener("error", giveUp);
    // A browser without TextTrack support has no cues to read: seek by the data alone.
    if (element.track === undefined) giveUp();
    else element.track.mode = "hidden";
    if (element.readyState === 2) settle();
    if (element.readyState === 3) giveUp();
    return () => {
      element.removeEventListener("load", settle);
      element.removeEventListener("error", giveUp);
    };
  }, [open, demo.chapters]);

  const play = (chapterId: string) => {
    pending.current = chapterId;
    if (open) seekPending();
    else setOpen(true);
  };

  const [posterRef, posterNear] = useNearViewport<HTMLButtonElement>();
  const label = `${demo.videoTitle} (${formatDuration(demo.durationSeconds)})`;
  const chaptersId = `${idPrefix}-chapters`;

  return (
    <div className="player">
      <div className="player__frame">
        {open && availability === "available" ? (
          <video
            ref={videoRef}
            className="player__video"
            controls
            playsInline
            preload="none"
            poster={demo.media.poster}
            aria-label={label}
            onLoadedMetadata={() => setMetadataReady(true)}
            onError={() => setFailed(true)}
          >
            <track kind="captions" src={demo.media.captions} srcLang="en" label="English" default />
            <track ref={chapterTrackRef} kind="chapters" src={demo.media.chapters} srcLang="en" />
            <source src={demo.media.video} type="video/mp4" onError={() => setFailed(true)} />
          </video>
        ) : availability === "available" ? (
          <button type="button" className="poster" ref={posterRef} onClick={() => play("")}>
            {posterNear ? (
              <img
                className="poster__image"
                src={demo.media.poster}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
              />
            ) : null}
            <span className="poster__play" aria-hidden="true">
              <PlayIcon />
            </span>
            <span className="poster__label">
              Play the narrated video: {demo.videoTitle}
              <span className="poster__time"> · {formatDuration(demo.durationSeconds)}</span>
            </span>
          </button>
        ) : (
          <div
            className="poster poster--placeholder"
            role="img"
            aria-label={
              availability === "checking"
                ? `${demo.videoTitle}: checking for the video`
                : availability === "failed"
                  ? `${demo.videoTitle}: the video could not be played`
                  : `${demo.videoTitle}: video coming soon`
            }
            aria-busy={availability === "checking"}
          >
            <PosterArt />
            <span className="poster__label" aria-hidden="true">
              {availability === "checking"
                ? ""
                : availability === "failed"
                  ? "The video could not be played. The transcript has every word."
                  : demo.status === "live"
                    ? "Video coming soon"
                    : "Coming next"}
            </span>
          </div>
        )}
      </div>

      {demo.chapters.length > 0 ? (
        <nav className="chapters" aria-labelledby={chaptersId}>
          <p id={chaptersId} className="chapters__heading">
            Chapters
          </p>
          <ol className="chapters__list">
            {demo.chapters.map((chapter) => {
              const at = starts[chapter.id];
              return (
                <li key={chapter.id}>
                  {availability === "available" ? (
                    <button
                      type="button"
                      className="chapters__item"
                      onClick={() => play(chapter.id)}
                      aria-label={`Play from chapter: ${chapter.title}`}
                    >
                      <span>{chapter.title}</span>
                      {at === undefined ? null : (
                        <span className="chapters__time">{formatClock(at)}</span>
                      )}
                    </button>
                  ) : demo.status === "live" ? (
                    <Link
                      href={transcriptHref(chapter.id)}
                      className="chapters__item"
                      aria-label={`Read chapter in the transcript: ${chapter.title}`}
                    >
                      <span>{chapter.title}</span>
                    </Link>
                  ) : (
                    <span className="chapters__item chapters__item--static">{chapter.title}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
    </div>
  );
}

/** The placeholder poster: a pod with grant lines, drawn in the site's own colours. */
function PosterArt() {
  return (
    <svg className="poster__art" viewBox="0 0 320 180" aria-hidden="true" focusable="false">
      <rect width="320" height="180" fill="var(--poster-bg)" />
      <g stroke="var(--poster-line)" strokeWidth="1.5" fill="none">
        <path d="M160 90 L60 40 M160 90 L60 140 M160 90 L260 40 M160 90 L260 140 M160 90 L160 24" />
        <path d="M160 90 L160 156" strokeDasharray="4 5" />
      </g>
      <circle cx="160" cy="90" r="28" fill="var(--poster-pod)" />
      <circle cx="160" cy="90" r="40" fill="none" stroke="var(--poster-pod)" strokeOpacity="0.35" />
      {[
        [60, 40],
        [60, 140],
        [260, 40],
        [260, 140],
        [160, 24],
        [160, 156],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill="var(--poster-node)" />
      ))}
    </svg>
  );
}
