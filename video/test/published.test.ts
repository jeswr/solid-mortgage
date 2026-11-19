// AUTHORED-BY Claude Opus 5.5
/**
 * The committed videos (`video/published/<demo>/`, served at the site's `/video/<demo>/`): every
 * demo has the four files the welcome page reads (`mediaFor` in apps/welcome/src/demos.ts), the
 * MP4 starts playing before it has fully arrived (fast start), carries narration and chapters,
 * and the length the welcome page shows is the recording's.
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
});
