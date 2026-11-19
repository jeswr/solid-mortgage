// AUTHORED-BY Claude Opus 5.5
/**
 * The committed videos (`video/published/<demo>/`, served at the site's `/video/<demo>/`): every
 * demo has the four files the welcome page reads (`mediaFor` in apps/welcome/src/demos.ts), the
 * MP4 starts playing before it has fully arrived (fast start), carries narration and chapters,
 * and the length the welcome page shows is the recording's. The narrator never falls silent for
 * longer than a paragraph break: the recorder fast-forwards every wait that outlasts the words
 * (lib/tighten.ts), and this measures the result on the published audio.
 *
 *   pnpm exec vitest run --root video
 */
import { execFile } from "node:child_process";
import { existsSync, openSync, readSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { DEMOS, mediaFor } from "../../apps/welcome/src/demos.ts";
import { DEMO_IDS, VIDEO } from "../lib/demo.ts";
import { TAIL } from "../lib/tighten.ts";
import { PUBLISHED_FILES, webEncodeArgs } from "../publish.ts";

const run = promisify(execFile);
const dir = (id: string) => path.join(VIDEO, "published", id);

async function probe(file: string) {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type",
    "-show_chapters",
    "-of",
    "json",
    file,
  ]);
  return JSON.parse(stdout) as {
    format: { duration: string };
    streams: { codec_type: string }[];
    chapters: unknown[];
  };
}

/**
 * Silence is audio below -40 dBFS for at least 0.3 s: the threshold voice.ts uses to find the
 * breaks in a take. Speech never drops below it mid-sentence, and between clips the mix is
 * digital silence, so what it finds is the gaps between words.
 */
async function silences(file: string) {
  const { stderr } = await run(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      file,
      "-map",
      "0:a",
      "-af",
      "silencedetect=noise=-40dB:d=0.3",
      "-f",
      "null",
      "-",
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const out: { start: number; end?: number }[] = [];
  for (const m of stderr.matchAll(/silence_(start|end): ([0-9.]+)/g)) {
    if (m[1] === "start") out.push({ start: Number(m[2]) });
    else if (out.at(-1)) (out.at(-1) as { end?: number }).end = Number(m[2]);
  }
  return out;
}

/**
 * The longest silence allowed between two paragraphs. The recorder leaves 0.85 s between one
 * clip's end and the next one's start (lib/tighten.ts BREAK), each clip keeps up to 0.2 s of the
 * take's own quiet at its edges, and the voice decays below -40 dB a little after the last word:
 * a deliberate break measures about 1.25-1.35 s. Any wait left uncompressed would exceed 1.5 s.
 */
const MAX_BREAK = 1.5;

describe("published videos", () => {
  test("the files published are the files the welcome page reads", () => {
    const media = mediaFor("x");
    expect(Object.values(media).map((url) => url.split("/").pop())).toEqual(
      expect.arrayContaining([...PUBLISHED_FILES]),
    );
    expect(webEncodeArgs("in.mp4", "out.mp4")).toEqual(
      expect.arrayContaining(["-movflags", "+faststart", "-map_chapters"]),
    );
  });

  for (const id of DEMO_IDS)
    test(id, async () => {
      for (const f of PUBLISHED_FILES) expect(existsSync(path.join(dir(id), f)), f).toBe(true);
      const file = path.join(dir(id), "video.mp4");
      // Fast start: the index (moov) comes before the media (mdat).
      const head = Buffer.alloc(64 * 1024);
      readSync(openSync(file, "r"), head, 0, head.length, 0);
      const moov = head.indexOf("moov");
      const mdat = head.indexOf("mdat");
      expect(moov).toBeGreaterThan(-1);
      expect(mdat === -1 || moov < mdat).toBe(true);
      const info = await probe(file);
      expect(info.streams.map((s) => s.codec_type)).toEqual(
        expect.arrayContaining(["video", "audio", "subtitle"]),
      );
      expect(info.chapters.length).toBeGreaterThan(0);
      const demo = DEMOS.find((d) => d.id === id);
      expect(demo?.media.video).toBe(`/video/${id}/video.mp4`);
      expect(Math.abs(Number(info.format.duration) - (demo?.durationSeconds ?? 0))).toBeLessThan(2);
    });

  for (const id of DEMO_IDS)
    test(`${id}: the narrator is never silent for longer than a paragraph break`, async () => {
      const file = path.join(dir(id), "video.mp4");
      const duration = Number((await probe(file)).format.duration);
      const found = await silences(file);
      const long: string[] = [];
      for (const s of found) {
        const end = s.end ?? duration;
        const len = end - s.start;
        // The opening (before the first word) and the end card (after the last) have their own limits.
        const limit = s.start < 0.05 ? 1 : end > duration - 0.05 ? TAIL + 0.5 : MAX_BREAK;
        if (len > limit) long.push(`${s.start.toFixed(1)} s: ${len.toFixed(2)} s silent`);
      }
      expect(long).toEqual([]);
    });
});
