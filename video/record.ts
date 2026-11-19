// AUTHORED-BY Claude Opus 5.5 (ported from the Solid Suite walkthrough recorder)
/**
 * Records one demo's narrated video from the built static site, the same way as the Solid Suite
 * walkthrough: `video/<demo>/narration.md` drives the timing, `scenes.ts` drives the screen,
 * Chromium is captured through the DevTools screencast, and the narration clips are laid on
 * afterwards with captions and chapters.
 *
 *   node --experimental-transform-types video/record.ts --demo mortgage     record
 *   ... --check [--strict] [--all]       validate the script only: no voice, no browser
 *   ... --rehearse                       run every step in the browser, fast, no video
 *   ... --only intro,ready               some scenes only
 *   ... --strict                         any warning fails (UI drift, a spoken total off)
 *
 * The site is `dist/` (run `pnpm run build` first), served in-process with production routing
 * (tools/serve-dist.mjs) unless `--site <url>` points at one already running. Narration clips are
 * `<voice>/clips/<scene>-<n>.mp3` (see voice.ts); a paragraph with no clip yet is held for its
 * estimated speaking time and captioned, so a draft can be cut before the scene is voiced.
 *
 * Output, in `video/dist/<demo>/` (copied to the site's `/video/<demo>/` by tools/build-site.mjs):
 * video.mp4 (1920x1080, H.264, AAC, soft subtitles, chapters), captions.vtt, chapters.vtt (cue id
 * = scene id), poster.jpg, report.json.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";
import { chromium } from "@playwright/test";
import { Capture } from "./lib/capture.ts";
import { type CheckResult, checkDemo, failures } from "./lib/check.ts";
import {
  DEMO_IDS,
  type DemoId,
  isBuilt,
  loadOrgs,
  loadTour,
  REPO,
  readDemo,
  staticMetrics,
  VIDEO,
} from "./lib/demo.ts";
import { Director, sleep } from "./lib/director.ts";
import { chaptersVtt, mux, type Placed } from "./lib/mux.ts";
import type { Action, Scene } from "./lib/narration.ts";
import type { PageGlobals } from "./lib/page-globals.ts";
import { startStatic } from "./lib/server.ts";
import { actions, type Ctx, presentation } from "./scenes.ts";

const run = promisify(execFile);
const { values: argv } = parseArgs({
  options: {
    demo: { type: "string", default: "mortgage" },
    all: { type: "boolean" },
    only: { type: "string" },
    check: { type: "boolean" },
    strict: { type: "boolean" },
    rehearse: { type: "boolean" },
    out: { type: "string" },
    voice: { type: "string" },
    site: { type: "string" },
    "copy-to": { type: "string" },
    headed: { type: "boolean" },
    cut: { type: "boolean" },
  },
});

const log = (s: string) => console.log(s);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** George reads at about 2.6 words a second here; drafts use that guess. */
const estimate = (t: string) => Math.max(0.8, t.split(/\s+/).filter(Boolean).length / 2.6);

export async function probeDuration(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    file,
  ]);
  return Number(stdout.trim());
}

function printCheck(r: CheckResult, strict: boolean) {
  const bad = failures(r, strict);
  log(
    `${bad.length ? "✗" : "✓"} ${r.demo}${r.built ? "" : " (not built yet)"}: ${r.paragraphs} paragraphs, ${r.words} words, about ${fmt(r.minutes * 60)}`,
  );
  for (const i of r.issues) log(`    ${i.level.padEnd(7)} ${i.where}: ${i.message}`);
  return bad.length;
}

async function check() {
  const ids = argv.all ? [...DEMO_IDS] : [argv.demo as DemoId];
  let failed = 0;
  for (const id of ids) {
    if (!DEMO_IDS.includes(id)) throw new Error(`unknown demo "${id}" (${DEMO_IDS.join(", ")})`);
    // Strict applies to built demos; a demo not built yet is checked against its script only.
    failed += printCheck(await checkDemo(id), !!argv.strict && isBuilt(id));
  }
  if (failed) process.exitCode = 1;
}

/** Serves dist/ with production routing, unless --site names a server already running. */
async function site(): Promise<{ url: string; close(): void }> {
  if (argv.site) return { url: argv.site.replace(/\/+$/, ""), close() {} };
  const dist = path.join(REPO, "dist");
  if (!existsSync(path.join(dist, "pods-sw.js")))
    throw new Error("dist/ is not built: run `pnpm run build` first");
  const mod = (await import(pathToFileURL(path.join(REPO, "tools", "serve-dist.mjs")).href)) as {
    createSiteServer(dir: string): Server;
  };
  const server = mod.createSiteServer(dist);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}

async function record() {
  const id = argv.demo as DemoId;
  const result = await checkDemo(id);
  if (printCheck(result, !!argv.strict))
    throw new Error("the script does not check; not recording");
  if (!isBuilt(id)) throw new Error(`${id} is not built yet: there is no tour to record`);

  const demo = readDemo(id);
  const tour = await loadTour(id);
  const orgs = await loadOrgs();
  const metrics = await staticMetrics(id);
  const only = argv.only?.split(",");
  const kept = demo.narration.scenes.filter((s) => !only || only.includes(s.id));
  const out = path.resolve(argv.out ?? path.join(VIDEO, "dist", id));
  const voice = path.resolve(argv.voice ?? path.join(VIDEO, id, "voice"));

  const clips = new Map<object, { file?: string; duration: number }>();
  let voiced = 0;
  let drafted = 0;
  for (const s of kept) {
    let n = 0;
    for (const st of s.steps) {
      if (!st.text) continue;
      const f = path.join(voice, "clips", `${s.id}-${n++}.mp3`);
      if (existsSync(f)) {
        clips.set(st, { file: f, duration: await probeDuration(f) });
        voiced++;
      } else {
        clips.set(st, { duration: estimate(st.text) });
        drafted++;
      }
    }
  }
  log(`Narration: ${voiced} voiced paragraphs, ${drafted} held silent (captions only)`);

  await mkdir(out, { recursive: true });
  const app = await site();
  const stat = await startStatic({ roots: { stage: path.join(VIDEO, "stage"), demo: demo.dir } });
  const browser = await chromium.launch({
    headless: !argv.headed,
    args: ["--force-color-profile=srgb", "--font-render-hinting=none", "--hide-scrollbars"],
  });
  // A fresh context is fresh demo data: the pods live in this context's service worker and
  // IndexedDB, and nothing carries over from an earlier run.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1.5,
    colorScheme: "light",
    reducedMotion: "no-preference",
    locale: "en-US",
  });
  await context.addInitScript({ path: path.join(VIDEO, "stage", "overlay.js") });
  await context.addInitScript(presentation);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.warn(`  page error: ${e.message.split("\n")[0]}`));

  const d = new Director(page, !!argv.strict);
  d.cut = !!argv.cut;
  const ctx: Ctx = {
    d,
    demo,
    tour,
    orgs,
    site: app.url,
    stage: `${stat.url}/stage`,
    demoStage: `${stat.url}/demo`,
    metrics,
    state: {},
  };
  const close = async () => {
    await browser.close();
    stat.close();
    app.close();
  };

  if (argv.rehearse) {
    await page.goto(`${stat.url}/stage/blank.html`);
    for (const scene of kept) {
      log(`▶ ${scene.id}`);
      for (const step of scene.steps) {
        await runActions(ctx, scene, step.actions);
        await runActions(ctx, scene, step.after);
      }
    }
    await close();
    log(
      `\nRehearsed ${kept.length} scenes: ${d.warnings.length ? `${d.warnings.length} warning(s)` : "all steps worked"}.`,
    );
    for (const w of d.warnings) log(`  ! ${w}`);
    if (d.warnings.length) process.exitCode = 1;
    return;
  }

  // Poster: the title card with everything shown.
  await page.goto(`${stat.url}/demo/cards.html#title`, { waitUntil: "networkidle" });
  await page.evaluate(() => (window as unknown as PageGlobals).cards.show("title", 9, true));
  await page.evaluate(() => document.fonts.ready);
  await sleep(400);
  await page.screenshot({ path: path.join(out, "poster.jpg"), type: "jpeg", quality: 90 });
  await page.goto(`${stat.url}/stage/blank.html`);

  const raw = path.join(out, "capture.mp4");
  const cap = new Capture(page, raw, { fps: 30, width: 1920, height: 1080, quality: 92, crf: 18 });
  await cap.start();
  d.nav = cap;
  const placed: Placed[] = [];
  const chapters: { id: string; at: number; title: string }[] = [];
  const LEAD = 0.35;
  const GAP = 0.5;
  for (const scene of kept) {
    log(`▶ ${scene.id}`);
    chapters.push({ id: scene.id, at: cap.now(), title: scene.title });
    for (const step of scene.steps) {
      const clip = clips.get(step);
      const start = cap.now();
      if (clip)
        placed.push({
          file: clip.file ?? "",
          at: start + LEAD,
          duration: clip.duration,
          text: step.text,
        });
      ctx.state.speakingUntil = performance.now() + (clip ? LEAD + clip.duration : 0) * 1000;
      const speaking = clip ? sleep((LEAD + clip.duration) * 1000) : Promise.resolve();
      await Promise.all([runActions(ctx, scene, step.actions), speaking]);
      await runActions(ctx, scene, step.after);
      await sleep((GAP + step.pause) * 1000);
    }
  }
  await sleep(1200);
  const seconds = await cap.stop();
  await close();

  log("Mixing…");
  const video = path.join(out, "video.mp4");
  const audio = placed.filter((p) => p.file);
  await mux({
    video: raw,
    videoSeconds: seconds,
    clips: audio,
    captionClips: placed,
    out: video,
    captions: path.join(out, "captions.vtt"),
    chapters,
    title: demo.narration.meta.title,
  });
  await rm(raw, { force: true });
  await writeFile(path.join(out, "chapters.vtt"), chaptersVtt(chapters, seconds));
  await writeFile(
    path.join(out, "report.json"),
    `${JSON.stringify(
      {
        demo: id,
        recordedAt: new Date().toISOString(),
        duration: Math.round(seconds),
        voiced,
        drafted,
        scenes: kept.map((s) => s.id),
        chapters: chapters.map((c) => ({ id: c.id, at: Number(c.at.toFixed(2)) })),
        totals: ctx.state.totals,
        warnings: d.warnings,
      },
      null,
      2,
    )}\n`,
  );
  if (argv["copy-to"]) {
    const dest = path.resolve(argv["copy-to"]);
    await mkdir(dest, { recursive: true });
    for (const f of ["video.mp4", "captions.vtt", "chapters.vtt", "poster.jpg", "report.json"])
      await copyFile(path.join(out, f), path.join(dest, f));
  }
  log(
    `\nDone: ${video} (${fmt(seconds)})${d.warnings.length ? `, ${d.warnings.length} warning(s)` : ""}`,
  );
  for (const w of d.warnings) log(`  ! ${w}`);
}

async function runActions(ctx: Ctx, scene: Scene, list: Action[]) {
  for (const a of list) {
    const fn = actions[a.name];
    try {
      if (!fn) throw new Error(`unknown action ${a.name}`);
      await fn(ctx, ...a.args);
    } catch (e) {
      const msg = `${scene.id} / ${a.name}: ${(e as Error).message.split("\n")[0]}`;
      if (argv.strict) throw new Error(msg);
      if (!ctx.d.warnings.includes(msg)) ctx.d.warnings.push(msg);
      console.warn(`  ! ${msg}`);
    }
  }
}

(argv.check ? check() : record()).catch((e) => {
  console.error(`\n✗ ${(e as Error).stack ?? e}`);
  process.exit(1);
});
