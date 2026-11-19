#!/usr/bin/env node
// AUTHORED-BY Claude Opus 5.5
/**
 * Vercel `ignoreCommand` (design.md §d.8): exit 1 to build, exit 0 to skip.
 *
 * - Production (merges to main) always builds.
 * - A preview builds only for a pull request labelled `preview`, which keeps the project well
 *   under Hobby's 100 deployments a day. Labels are read from the GitHub API; a private
 *   repository needs a `GITHUB_TOKEN` with read access in the project's environment. A branch
 *   named `preview/…` also builds, for when the label cannot be read.
 * - Anything else is skipped. Runs before `pnpm install`, so it uses Node built-ins only.
 */
import { pathToFileURL } from "node:url";

const env = process.env;
const BUILD = 1;
const SKIP = 0;

export async function decide(vars = env, fetchImpl = globalThis.fetch) {
  if (vars.VERCEL_ENV === "production") return { code: BUILD, reason: "production deployment" };
  const branch = vars.VERCEL_GIT_COMMIT_REF ?? "";
  if (branch.startsWith("preview/")) return { code: BUILD, reason: `branch ${branch}` };
  const pr = vars.VERCEL_GIT_PULL_REQUEST_ID;
  const owner = vars.VERCEL_GIT_REPO_OWNER;
  const repo = vars.VERCEL_GIT_REPO_SLUG;
  if (!pr || !owner || !repo) return { code: SKIP, reason: "preview without a pull request" };
  const headers = { accept: "application/vnd.github+json", "user-agent": "vercel-ignore-step" };
  if (vars.GITHUB_TOKEN) headers.authorization = `Bearer ${vars.GITHUB_TOKEN}`;
  try {
    const response = await fetchImpl(
      `https://api.github.com/repos/${owner}/${repo}/issues/${pr}/labels`,
      { headers, signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) return { code: SKIP, reason: `labels unreadable (HTTP ${response.status})` };
    const labels = (await response.json()).map((label) => label.name);
    return labels.includes("preview")
      ? { code: BUILD, reason: `pull request #${pr} is labelled preview` }
      : { code: SKIP, reason: `pull request #${pr} is not labelled preview` };
  } catch (error) {
    return { code: SKIP, reason: `labels unreadable (${error.name})` };
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { code, reason } = await decide();
  console.log(`vercel-ignore: ${code === BUILD ? "build" : "skip"} (${reason})`);
  process.exit(code);
}
