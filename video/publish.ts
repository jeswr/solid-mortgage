// AUTHORED-BY Claude Opus 5.5
/**
 * Copies recorded videos into `video/published/<demo>/`, the copy that is committed and served
 * at the site's `/video/<demo>/` (tools/build-site.mjs). The recorder's `video/dist/` output is
 * archival (CRF 18) and not in git; this re-encodes the picture for the web (H.264 CRF 28,
 * fast start, so a browser can play before the whole file arrives), keeps the narration, the
 * soft captions and the chapters, and copies captions.vtt, chapters.vtt and poster.jpg beside it.
 *
 *   node --experimental-transform-types video/publish.ts [--demo <id> | --all]
 *
 * A demo with no recording in video/dist/ is skipped. Nothing here calls a voice service.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import { DEMO_IDS, type DemoId, VIDEO } from "./lib/demo.ts";

const run = promisify(execFile);

/** The files the welcome page reads for a demo (`mediaFor` in apps/welcome/src/demos.ts). */
export const PUBLISHED_FILES = ["video.mp4", "captions.vtt", "chapters.vtt", "poster.jpg"] as const;

/** ffmpeg arguments that re-encode one recording for the web. */
export function webEncodeArgs(input: string, output: string): string[] {
  return [
    "-y",
    "-v",
    "error",
    "-i",
    input,
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-map",
    "0:s?",
    "-map_metadata",
    "0",
    "-map_chapters",
    "0",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "28",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-c:s",
    "mov_text",
    "-movflags",
    "+faststart",
    output,
  ];
}

export async function publish(id: DemoId): Promise<{ bytes: number } | undefined> {
  const from = path.join(VIDEO, "dist", id);
  if (!existsSync(path.join(from, "video.mp4"))) return undefined;
  const to = path.join(VIDEO, "published", id);
  await mkdir(to, { recursive: true });
  const partial = path.join(to, "video.part.mp4");
  await run("ffmpeg", webEncodeArgs(path.join(from, "video.mp4"), partial), {
    maxBuffer: 64 * 1024 * 1024,
  });
  await rename(partial, path.join(to, "video.mp4"));
  for (const f of PUBLISHED_FILES.slice(1)) await copyFile(path.join(from, f), path.join(to, f));
  return { bytes: (await stat(path.join(to, "video.mp4"))).size };
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: { demo: { type: "string" }, all: { type: "boolean" } },
  });
  const ids = values.all ? [...DEMO_IDS] : [(values.demo ?? "mortgage") as DemoId];
  for (const id of ids) {
    if (!DEMO_IDS.includes(id)) throw new Error(`unknown demo "${id}" (${DEMO_IDS.join(", ")})`);
    const r = await publish(id);
    console.log(
      r
        ? `published ${id}: video.mp4 ${(r.bytes / 1e6).toFixed(1)} MB`
        : `skipped ${id}: no recording in video/dist/${id}/`,
    );
  }
}
