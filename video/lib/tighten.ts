// AUTHORED-BY Claude Opus 5.5
/**
 * Takes the dead air out of a recording. The recorder waits for the app (an agent, a proof, a
 * page load) as long as it takes, so a paragraph's clip can end well before the next one starts,
 * and the narrator falls silent. In post-production every such wait is fast-forwarded until the
 * break is the deliberate one again: a short moment at normal speed after the words end, a quick
 * fast-forward through the wait (the screen keeps moving, so nothing jumps), and the last part of
 * the break at normal speed into the next paragraph. Nothing in the app is changed or skipped for
 * visitors; only the recording's timeline is.
 *
 * The plan is pure (tested in test/tighten.test.ts); `retime` applies it to a video with one
 * streaming ffmpeg pass (setpts over a piecewise-linear time map, then a constant frame rate,
 * which drops the frames of the fast-forwarded spans).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** The silence between two paragraphs as recorded: LEAD (0.35 s) before a clip plus GAP (0.5 s) after a step. */
export const BREAK = 0.85;
/** How long the end card is held after the last word. */
export const TAIL = 1.5;
/** Normal speed kept after the words end, before the fast-forward starts. */
export const HEAD = 0.15;
/** How long a fast-forward lasts on screen, however long the wait was. */
export const FAST = 0.25;
/** A break this much longer than allowed is left alone (too short to fast-forward). */
export const SLACK = 0.1;

export interface Spoken {
  /** Where the clip starts and ends in the recording, in seconds. */
  at: number;
  end: number;
  /** The silence allowed after it before the next clip: BREAK plus any `[pause: s]`. */
  allowed: number;
}

/** A span of the recording [from, to] that plays in `out` seconds. */
export interface Span {
  from: number;
  to: number;
  out: number;
}

export interface Plan {
  spans: Span[];
  /** The recording's length and the tightened length. */
  recorded: number;
  duration: number;
  /** Each over-long break: where it was, how long, and how long it is now. */
  gaps: { after: number; was: number; now: number }[];
}

/**
 * Plans the fast-forwards: every silence longer than allowed (between two clips, or after the
 * last clip, where the end card is held for TAIL whatever the pause) keeps HEAD at normal speed, plays the wait in FAST seconds and
 * keeps the rest of the allowed break at normal speed into what follows.
 */
export function plan(spoken: Spoken[], recorded: number): Plan {
  const sorted = [...spoken].sort((a, b) => a.at - b.at);
  const spans: Span[] = [];
  const gaps: Plan["gaps"] = [];
  sorted.forEach((s, i) => {
    const next = sorted[i + 1];
    const stop = next ? next.at : recorded;
    const allowed = next ? s.allowed : TAIL;
    const was = stop - s.end;
    if (was <= allowed + SLACK) return;
    const keep = Math.max(allowed, HEAD + FAST);
    const from = s.end + HEAD;
    const to = stop - (keep - HEAD - FAST);
    spans.push({ from, to, out: FAST });
    gaps.push({ after: s.end, was, now: keep });
  });
  const removed = spans.reduce((a, s) => a + (s.to - s.from - s.out), 0);
  return { spans, recorded, duration: recorded - removed, gaps };
}

/** Maps a moment in the recording to the same moment in the tightened video. */
export function mapTime(spans: Span[], t: number): number {
  let shift = 0;
  for (const s of spans) {
    if (t <= s.from) break;
    const len = s.to - s.from;
    shift += (1 - s.out / len) * Math.min(t - s.from, len);
  }
  return t - shift;
}

/** The setpts expression for the same map (T is the input frame's time in seconds). */
export function setptsExpr(spans: Span[]): string {
  const terms = spans.map((s) => {
    const len = s.to - s.from;
    return `${(1 - s.out / len).toFixed(6)}*clip(T-${s.from.toFixed(3)},0,${len.toFixed(3)})`;
  });
  return `(T${terms.map((t) => `-${t}`).join("")})/TB`;
}

/** ffmpeg arguments that apply a plan to a constant-frame-rate recording. */
export function retimeArgs(input: string, output: string, spans: Span[], fps: number, crf: number) {
  return [
    "-v",
    "error",
    "-y",
    "-i",
    input,
    "-map",
    "0:v:0",
    "-vf",
    `setpts='${setptsExpr(spans)}',fps=${fps}`,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-tune",
    "stillimage",
    "-crf",
    String(crf),
    "-pix_fmt",
    "yuv420p",
    output,
  ];
}

export async function retime(
  input: string,
  output: string,
  spans: Span[],
  opts: { fps: number; crf: number },
) {
  await run("ffmpeg", retimeArgs(input, output, spans, opts.fps, opts.crf), {
    maxBuffer: 64 * 1024 * 1024,
  });
}
