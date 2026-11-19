// AUTHORED-BY Claude Opus 5.5

import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { APP_SLUGS } from "../packages/demo-kit/src/registry.ts";
import { CRS_FILES, CRS_G1, CRS_G2 } from "../packages/vc-kit/src/zk/crs-pins.ts";
import { collectCrs, siteApps } from "../tools/build-site.mjs";
import { createSiteServer } from "../tools/serve-dist.mjs";
import {
  CRS_URL_PATHS,
  headersFor,
  renderVercelJson,
  resolveRequest,
  SITE_SLUGS,
  VERCEL_JSON,
} from "../tools/site-routes.mjs";
import { decide } from "../tools/vercel-ignore.mjs";

describe("site routes", () => {
  it("vercel.json is generated from tools/site-routes.mjs", () => {
    expect(readFileSync(VERCEL_JSON, "utf8")).toBe(renderVercelJson());
  });

  it("serves every demo app slug plus the template", () => {
    expect(SITE_SLUGS).toEqual([...APP_SLUGS, "_template"]);
    const config = JSON.parse(renderVercelJson());
    expect(config.outputDirectory).toBe("dist");
    for (const slug of SITE_SLUGS) expect(config.rewrites[0].source).toContain(slug);
  });

  it("resolves redirects, files and per-app fallbacks", () => {
    const files = new Set(["wallet/index.html", "wallet/assets/a.js", "pods-sw.js"]);
    const exists = (path: string) => files.has(path);
    expect(resolveRequest("/", exists)).toEqual({ redirect: "/welcome/" });
    expect(resolveRequest("/wallet", exists)).toEqual({ redirect: "/wallet/" });
    expect(resolveRequest("/wallet/", exists)).toEqual({
      fallback: false,
      file: "wallet/index.html",
    });
    expect(resolveRequest("/wallet/requests", exists)).toEqual({
      fallback: true,
      file: "wallet/index.html",
    });
    expect(resolveRequest("/wallet/assets/missing.js", exists)).toEqual({
      fallback: false,
      file: null,
    });
    expect(resolveRequest("/pods-sw.js", exists)).toEqual({ fallback: false, file: "pods-sw.js" });
    expect(resolveRequest("/nowhere/x", exists)).toEqual({ fallback: false, file: null });
  });

  it("sets noindex everywhere and isolation only on the prove route", () => {
    expect(headersFor("/lender/")["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(headersFor("/pods-sw.js")["Service-Worker-Allowed"]).toBe("/");
    expect(headersFor("/wallet/prove")["Cross-Origin-Embedder-Policy"]).toBe("require-corp");
    expect(headersFor("/wallet/prove/run")["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headersFor("/wallet/")["Cross-Origin-Embedder-Policy"]).toBeUndefined();
    expect(headersFor("/wallet/prover")["Cross-Origin-Embedder-Policy"]).toBeUndefined();
    expect(headersFor("/wallet/lending/prove")["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headersFor("/wallet/lending")["Cross-Origin-Opener-Policy"]).toBeUndefined();
    // Workers an isolated page starts must carry the same embedder policy, or they are blocked.
    for (const worker of ["/wallet/assets/main.worker-x.js", "/pods-sw.js", "/agents/wallet.js"]) {
      expect(headersFor(worker)["Cross-Origin-Embedder-Policy"]).toBe("require-corp");
      expect(headersFor(worker)["Cross-Origin-Opener-Policy"]).toBeUndefined();
    }
    expect(headersFor("/lender/assets/x.js")["Cross-Origin-Embedder-Policy"]).toBeUndefined();
    expect(headersFor("/bank/assets/x.js")["Cache-Control"]).toContain("immutable");
  });

  it("serves the prover's CRS from the site, same-origin only and cached by its hashed name", () => {
    const crs = headersFor("/crs/bn254-g1-32768-50d2f4e9567be2b8.dat");
    expect(crs["Cross-Origin-Resource-Policy"]).toBe("same-origin");
    expect(crs["Cache-Control"]).toContain("immutable");
    expect(crs["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(resolveRequest("/crs/bn254-g2-01797bfc4de5a96f.dat", () => true)).toEqual({
      fallback: false,
      file: "crs/bn254-g2-01797bfc4de5a96f.dat",
    });
    // A CRS file the site lacks is a 404, never an app's page.
    expect(resolveRequest("/crs/missing.dat", () => false)).toEqual({
      fallback: false,
      file: null,
    });
  });

  it("caches only the pinned CRS names as immutable, on Vercel and locally", () => {
    expect(CRS_URL_PATHS).toEqual(CRS_FILES.map((pin) => `/crs/${pin.file}`));
    for (const path of CRS_URL_PATHS)
      expect(headersFor(path)["Cache-Control"]).toContain("immutable");
    // Any other name under /crs/ is a 404 on a deployment: it must not be cached for a year.
    for (const path of ["/crs/missing.dat", "/crs/", `/crs/${CRS_G1.file}.bak`]) {
      expect(headersFor(path)["Cache-Control"]).toBeUndefined();
      expect(headersFor(path)["X-Robots-Tag"]).toBe("noindex, nofollow");
    }
    const sources = JSON.parse(renderVercelJson())
      .headers.map((rule: { source: string }) => rule.source)
      .filter((source: string) => source.startsWith("/crs/"));
    expect(sources).toEqual([...CRS_URL_PATHS]);
  });
});

describe("serve-dist", () => {
  let dir: string;
  let origin: string;
  let close: () => Promise<void>;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "serve-dist-"));
    mkdirSync(join(dir, "lender", "assets"), { recursive: true });
    writeFileSync(join(dir, "lender", "index.html"), "<p>lender</p>");
    writeFileSync(join(dir, "lender", "assets", "app.js"), "export {};");
    writeFileSync(join(dir, "secret.txt"), "top");
    mkdirSync(join(dir, "crs"));
    writeFileSync(join(dir, "crs", CRS_G2.file), "g2");
    const server = createSiteServer(dir);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => new Promise((resolve) => server.close(() => resolve()));
  });

  afterAll(async () => {
    await close();
    rmSync(dir, { force: true, recursive: true });
  });

  it("answers like production", async () => {
    const root = await fetch(`${origin}/`, { redirect: "manual" });
    expect(root.status).toBe(307);
    expect(root.headers.get("location")).toBe("/welcome/");
    const deep = await fetch(`${origin}/lender/loans/JHL-1001`);
    expect(deep.status).toBe(200);
    expect(await deep.text()).toBe("<p>lender</p>");
    expect(deep.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const asset = await fetch(`${origin}/lender/assets/app.js`);
    expect(asset.headers.get("content-type")).toContain("text/javascript");
    expect(asset.headers.get("cache-control")).toContain("immutable");
    expect((await fetch(`${origin}/lender/assets/gone.js`)).status).toBe(404);
  });

  it("answers 404 for an app that is not built, and revalidates with Last-Modified", async () => {
    expect((await fetch(`${origin}/wallet/requests`)).status).toBe(404);
    const first = await fetch(`${origin}/lender/assets/app.js`);
    const lastModified = first.headers.get("last-modified");
    expect(lastModified).toBeTruthy();
    const again = await fetch(`${origin}/lender/assets/app.js`, {
      headers: { "If-Modified-Since": lastModified ?? "" },
    });
    expect(again.status).toBe(304);
  });

  it("caches a pinned CRS file as immutable, but never a 404", async () => {
    const served = await fetch(`${origin}/crs/${CRS_G2.file}`);
    expect(served.status).toBe(200);
    expect(served.headers.get("cache-control")).toContain("immutable");
    expect(served.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    // A pinned name missing from dist/, another name under /crs/, a missing hashed asset: 404s,
    // none of them cached as immutable.
    for (const path of [`/crs/${CRS_G1.file}`, "/crs/missing.dat", "/lender/assets/gone.js"]) {
      const missing = await fetch(`${origin}${path}`);
      expect(missing.status).toBe(404);
      expect(missing.headers.get("cache-control") ?? "").not.toContain("immutable");
    }
  });

  it("never serves a file outside dist/", async () => {
    // fetch() would normalise the path, so send raw request lines.
    const statusOf = (path: string) =>
      new Promise<number>((resolve, reject) => {
        request(`${origin}/`, { path }, (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        })
          .on("error", reject)
          .end();
      });
    // Dot segments are resolved against the site root, so they cannot climb out of it.
    expect(await statusOf("/lender/%2e%2e/%2e%2e/%2e%2e/etc/passwd")).toBe(404);
    // An encoded slash that would rebuild a ".." segment after decoding is refused.
    expect(await statusOf("/lender/..%2f..%2f..%2fetc%2fpasswd")).toBe(400);
  });
});

describe("vercel-ignore", () => {
  const fakeFetch = (labels: string[], status = 200) =>
    (async () =>
      new Response(JSON.stringify(labels.map((name) => ({ name }))), { status })) as typeof fetch;
  const pr = {
    VERCEL_ENV: "preview",
    VERCEL_GIT_PULL_REQUEST_ID: "12",
    VERCEL_GIT_REPO_OWNER: "owner",
    VERCEL_GIT_REPO_SLUG: "repo",
  };

  it("always builds production", async () => {
    expect((await decide({ VERCEL_ENV: "production" }, fakeFetch([]))).code).toBe(1);
  });

  it("builds a preview only for a pull request labelled preview", async () => {
    expect((await decide(pr, fakeFetch(["preview"]))).code).toBe(1);
    expect((await decide(pr, fakeFetch(["docs"]))).code).toBe(0);
    expect((await decide(pr, fakeFetch([], 404))).code).toBe(0);
    expect((await decide({ VERCEL_ENV: "preview" }, fakeFetch(["preview"]))).code).toBe(0);
    expect((await decide({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "preview/x" })).code).toBe(
      1,
    );
  });
});

describe("build-site", () => {
  describe("collectCrs", () => {
    const source = join(import.meta.dirname, "..", "packages", "vc-kit", "crs");
    let dir: string;
    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), "crs-"));
    });
    afterAll(() => rmSync(dir, { force: true, recursive: true }));
    const copy = (name: string) => {
      const target = join(dir, name);
      rmSync(target, { force: true, recursive: true });
      cpSync(source, target, { recursive: true });
      return target;
    };

    it("takes exactly the pinned files, as committed", () => {
      const files = collectCrs(source);
      expect(files.map((entry: { file: string }) => entry.file)).toEqual(
        CRS_FILES.map((pin) => pin.file),
      );
      // It returns the bytes it checked, which the build writes into dist/crs/.
      for (const [index, pin] of CRS_FILES.entries()) {
        expect(Buffer.compare(files[index].bytes, readFileSync(join(source, pin.file)))).toBe(0);
      }
    });

    it("fails when a pinned file is missing, or the directory is", () => {
      const target = copy("missing");
      rmSync(join(target, CRS_G2.file));
      expect(() => collectCrs(target)).toThrow(`lacks the pinned CRS file(s) ${CRS_G2.file}`);
      expect(() => collectCrs(join(dir, "nowhere"))).toThrow("lacks the pinned CRS file(s)");
    });

    it("fails on any file vc-kit does not pin", () => {
      const target = copy("extra");
      writeFileSync(join(target, "bn254-g1-65536-0000000000000000.dat"), "more points");
      expect(() => collectCrs(target)).toThrow("does not pin: bn254-g1-65536-0000000000000000.dat");
    });

    it("refuses a pinned name that is a symbolic link, even to the genuine file", () => {
      // The link's target passes every check, but a copy of the path would ship the link itself.
      const target = copy("link");
      rmSync(join(target, CRS_G2.file));
      symlinkSync(join(source, CRS_G2.file), join(target, CRS_G2.file));
      expect(() => collectCrs(target)).toThrow(`${CRS_G2.file} is a symbolic link`);
    });

    it("refuses a pinned name that is a directory, and a CRS directory that is a link", () => {
      const target = copy("directory");
      rmSync(join(target, CRS_G2.file));
      mkdirSync(join(target, CRS_G2.file));
      expect(() => collectCrs(target)).toThrow(`${CRS_G2.file} is not a regular file`);
      const linked = join(dir, "linked-directory");
      rmSync(linked, { force: true, recursive: true });
      symlinkSync(source, linked);
      expect(() => collectCrs(linked)).toThrow("is not a directory (a symbolic link is refused)");
    });

    it("fails on a same-length change to a pinned file, and on a wrong length", () => {
      const tampered = copy("tampered");
      const g1 = readFileSync(join(tampered, CRS_G1.file));
      g1[g1.length - 1] = (g1[g1.length - 1] ?? 0) ^ 1;
      writeFileSync(join(tampered, CRS_G1.file), g1);
      expect(() => collectCrs(tampered)).toThrow(
        `${CRS_G1.file} does not match its pinned SHA-256`,
      );
      const short = copy("short");
      writeFileSync(join(short, CRS_G2.file), readFileSync(join(source, CRS_G2.file)).subarray(1));
      expect(() => collectCrs(short)).toThrow(`${CRS_G2.file} is 127 bytes, not the pinned 128`);
    });
  });

  it("finds the Vite apps and skips the vocab project", () => {
    const slugs = siteApps().map((app: { slug: string }) => app.slug);
    expect(slugs).toContain("_template");
    expect(slugs).not.toContain("vocab");
    for (const slug of slugs) expect(SITE_SLUGS).toContain(slug);
  });
});
