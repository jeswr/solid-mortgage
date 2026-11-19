// AUTHORED-BY Claude Opus 5.5 (ported from the Solid Suite walkthrough recorder's scenetext.ts and split.ts)
/**
 * Narration takes: one ElevenLabs take per scene ("George", eleven_multilingual_v2), its
 * paragraphs separated by 1.8 s break tags, then split into one clip per paragraph.
 *
 *   node --experimental-transform-types video/voice.ts text  --demo mortgage
 *       Writes <voice>/scenes.json and prints each scene's take text, its character count, and
 *       whether a take for exactly that text is already cached.
 *   node --experimental-transform-types video/voice.ts split --demo mortgage
 *       Splits <voice>/raw/<scene>-<hash>.mp3 into <voice>/clips/<scene>-<n>.mp3.
 *
 * A take is named by a hash of the text sent to the voice, so a scene whose words have not
 * changed is never voiced again, and a changed scene has no take until it is re-voiced. Takes
 * are generated outside this script (the ElevenLabs API or its MCP tools) and saved under
 * <voice>/raw/ with the name `text` prints. <voice> defaults to video/<demo>/voice (not in git).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { type DemoId, readDemo, VIDEO } from "./lib/demo.ts";
import { forSpeech } from "./lib/narration.ts";

export const VOICE = {
  name: "George",
  voiceId: "JBFqnCBsd6RMkjVDRZzb",
  model: "eleven_multilingual_v2",
};
export const BREAK = ' <break time="1.8s" /> ';

const { values: argv, positionals } = parseArgs({
  allowPositionals: true,
  options: { demo: { type: "string", default: "mortgage" }, voice: { type: "string" } },
});
const id = argv.demo as DemoId;
const voice = path.resolve(argv.voice ?? path.join(VIDEO, id, "voice"));
const lexicon = JSON.parse(readFileSync(path.join(VIDEO, "lexicon.json"), "utf8")) as Record<
  string,
  string
>;

/** Each scene's paragraphs as spoken, and the text of its take. */
export function takes(demo: DemoId) {
  const { narration } = readDemo(demo);
  return narration.scenes.map((s) => {
    const paragraphs = s.steps.filter((x) => x.text).map((x) => forSpeech(x.text, lexicon));
    const text = paragraphs.join(BREAK);
    const hash = createHash("sha256")
      .update(`${VOICE.voiceId}\n${VOICE.model}\n${text}`)
      .digest("hex")
      .slice(0, 10);
    return { scene: s.id, paragraphs, text, file: `${s.id}-${hash}.mp3` };
  });
}

function text() {
  mkdirSync(path.join(voice, "raw"), { recursive: true });
  const all = takes(id);
  writeFileSync(
    path.join(voice, "scenes.json"),
    `${JSON.stringify(Object.fromEntries(all.map((t) => [t.scene, t])), null, 1)}\n`,
  );
  let needed = 0;
  for (const t of all) {
    const cached = existsSync(path.join(voice, "raw", t.file));
    if (!cached) needed += t.text.length;
    console.log(
      `### ${t.scene} -> raw/${t.file} (${t.text.length} chars, ${cached ? "cached" : "NEEDS A TAKE"})\n${t.text}\n`,
    );
  }
  console.log(
    `${needed} characters still to voice (${VOICE.name}, ${VOICE.voiceId}, ${VOICE.model})`,
  );
}

function split() {
  const out = path.join(voice, "clips");
  mkdirSync(out, { recursive: true });
  let failed = 0;
  for (const t of takes(id)) {
    const file = path.join(voice, "raw", t.file);
    if (!existsSync(file)) {
      console.log(`${t.scene}: no take for this text yet (raw/${t.file})`);
      continue;
    }
    const dur = Number(
      execFileSync("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        file,
      ]).toString(),
    );
    const n = t.paragraphs.length;
    // The breaks are the n-1 longest silences; try a few thresholds until exactly that many show.
    let gaps: { s: number; e: number }[] = [];
    for (const d of [1.2, 1.0, 0.9, 0.8, 1.4]) {
      const err = execFileSync(
        "bash",
        [
          "-c",
          `ffmpeg -hide_banner -i "$0" -af silencedetect=noise=-40dB:d=${d} -f null - 2>&1 | grep -oE "silence_(start|end): [0-9.]+" || true`,
          file,
        ],
        { encoding: "utf8" },
      );
      const marks = [...err.matchAll(/silence_(start|end): ([0-9.]+)/g)].map((m) => ({
        k: m[1],
        t: Number(m[2]),
      }));
      const found: { s: number; e: number }[] = [];
      for (let i = 0; i < marks.length - 1; i++)
        if (marks[i]?.k === "start" && marks[i + 1]?.k === "end")
          found.push({ s: marks[i]?.t as number, e: marks[i + 1]?.t as number });
      // Leading or trailing silence is not a break.
      gaps = found.filter((g) => g.s > 0.3 && g.e < dur - 0.3);
      if (gaps.length === n - 1) break;
    }
    if (gaps.length !== n - 1) {
      console.log(`${t.scene}: expected ${n - 1} breaks, found ${gaps.length}; not split`);
      failed++;
      continue;
    }
    const bounds = [0, ...gaps.flatMap((g) => [g.s + 0.12, g.e - 0.08]), dur];
    for (let i = 0; i < n; i++) {
      const [a, b] = [bounds[2 * i] as number, bounds[2 * i + 1] as number];
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-y",
        "-i",
        file,
        "-ss",
        a.toFixed(3),
        "-to",
        b.toFixed(3),
        "-c:a",
        "libmp3lame",
        "-q:a",
        "2",
        path.join(out, `${t.scene}-${i}.mp3`),
      ]);
    }
    console.log(`${t.scene}: ${n} clips`);
  }
  if (failed) process.exitCode = 1;
}

if (positionals[0] === "text") text();
else if (positionals[0] === "split") split();
else {
  console.error("usage: voice.ts text|split [--demo <id>] [--voice <dir>]");
  process.exitCode = 2;
}
