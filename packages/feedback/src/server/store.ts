// AUTHORED-BY Claude Opus 5.5
/**
 * Feedback storage in a private GitHub repository. Each submission is one commit adding
 * `feedback/<date>/<id>/` (`submission.json`, `summary.md`, any recordings) to the default
 * branch, plus one issue that links to it; the issue number is the visitor's reference.
 *
 * The repository must be private: its visibility is checked before every upload and save, and a
 * public (or unreadable) repository refuses the write. The token never leaves this module, and
 * no GitHub response body is ever shown to the visitor or logged.
 */
import { randomUUID } from "node:crypto";
import { plainTitle, renderMarkdown } from "../markdown.js";
import type { Submission } from "../validation.js";
import type { AudioFile } from "./audio.js";
import { type SignedReceipt, signReceipt } from "./receipts.js";
import { type FeedbackEnv, FeedbackError } from "./security.js";

export interface FeedbackStore {
  upload(audio: AudioFile): Promise<SignedReceipt>;
  save(submission: Submission, audio: readonly SignedReceipt[]): Promise<{ reference: number }>;
}

/** `owner/name`, GitHub's allowed characters only. */
export const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** Whether sending is configured: a token and a well-formed repository name. */
export function storageConfigured(env: FeedbackEnv): boolean {
  const repo = env.FEEDBACK_GITHUB_REPO?.trim() ?? "";
  return Boolean(env.FEEDBACK_GITHUB_TOKEN?.trim()) && REPO_PATTERN.test(repo);
}

const failure = () =>
  new FeedbackError(
    502,
    "We couldn't finish saving your feedback. Download a copy before trying again.",
  );

const checkedSha = (value: unknown): string => {
  if (typeof value !== "string" || !/^[a-f0-9]{40,64}$/.test(value)) throw failure();
  return value;
};

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

export function createGithubStore(
  env: FeedbackEnv,
  transport: typeof fetch = fetch,
  now: () => Date = () => new Date(),
  uuid: () => string = randomUUID,
  pause: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): FeedbackStore {
  const token = env.FEEDBACK_GITHUB_TOKEN?.trim();
  const repo = env.FEEDBACK_GITHUB_REPO?.trim() ?? "";
  const base = `https://api.github.com/repos/${repo}`;
  const call = (path: string, method: string, body?: unknown) =>
    transport(`${base}${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "solid-mortgage-feedback",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const read = async (path: string, method = "GET", body?: unknown) => {
    const response = await call(path, method, body);
    if (!response.ok) throw failure();
    return (await response.json()) as Record<string, unknown> & {
      object?: { sha?: unknown };
      tree?: { sha?: unknown };
    };
  };

  let repository: Promise<{ branch: string }> | undefined;
  const metadata = () => {
    if (!token || !REPO_PATTERN.test(repo)) {
      throw new FeedbackError(
        503,
        "Sending feedback isn't switched on yet. Download your feedback to keep it.",
      );
    }
    repository ??= (async () => {
      const response = await call("", "GET");
      const data = (response.ok ? await response.json() : {}) as Record<string, unknown>;
      if (
        data.private !== true ||
        typeof data.default_branch !== "string" ||
        !data.default_branch
      ) {
        throw new FeedbackError(
          503,
          "Private feedback storage is unavailable. Download your feedback to keep it.",
        );
      }
      return { branch: data.default_branch };
    })().catch((error: unknown) => {
      repository = undefined;
      throw error;
    });
    return repository;
  };

  const blob = async (bytes: Uint8Array) =>
    checkedSha(
      (await read("/git/blobs", "POST", { content: toBase64(bytes), encoding: "base64" })).sha,
    );
  const textBlob = (text: string) => blob(new TextEncoder().encode(text));

  return {
    async upload(audio) {
      await metadata();
      const sha = await blob(audio.bytes);
      return signReceipt({ sha, size: audio.bytes.length, ext: audio.ext }, env, now().getTime());
    },

    async save(submission, audio) {
      const { branch } = await metadata();
      const id = uuid();
      const createdAt = now().toISOString();
      const directory = `feedback/${createdAt.slice(0, 10)}/${id}`;
      const audioNames = audio.map((clip, i) => `audio-${i + 1}.${clip.ext}`);
      const recordSha = await textBlob(
        `${JSON.stringify(
          {
            ...submission,
            id,
            createdAt,
            audio: audio.map(({ sha, size, ext }, i) => ({ path: audioNames[i], sha, size, ext })),
          },
          null,
          2,
        )}\n`,
      );
      const summarySha = await textBlob(`${renderMarkdown(submission, audioNames)}\n`);
      const tree = [
        ...audio.map((clip, i) => ({ path: `${directory}/${audioNames[i]}`, sha: clip.sha })),
        { path: `${directory}/submission.json`, sha: recordSha },
        { path: `${directory}/summary.md`, sha: summarySha },
      ].map((entry) => ({ ...entry, mode: "100644", type: "blob" }));
      const ref = `heads/${encodeURIComponent(branch)}`;
      let commitSha = "";
      // A writer that loses a race rebuilds on the new head; the blobs are reused.
      for (let attempt = 0; attempt <= 5; attempt++) {
        const head = checkedSha((await read(`/git/ref/${ref}`)).object?.sha);
        const baseTree = checkedSha((await read(`/git/commits/${head}`)).tree?.sha);
        const nextTree = checkedSha(
          (await read("/git/trees", "POST", { base_tree: baseTree, tree })).sha,
        );
        const commit = checkedSha(
          (
            await read("/git/commits", "POST", {
              message: `Store demo feedback ${id}`,
              tree: nextTree,
              parents: [head],
            })
          ).sha,
        );
        const update = await call(`/git/refs/${ref}`, "PATCH", { sha: commit, force: false });
        if (update.ok) {
          commitSha = commit;
          break;
        }
        const error = (await update.json().catch(() => ({}))) as { message?: unknown };
        const message = typeof error.message === "string" ? error.message : "";
        if (
          update.status !== 422 ||
          !/not (?:a )?fast[- ]forward/i.test(message) ||
          attempt === 5
        ) {
          throw failure();
        }
        await pause(100 * 2 ** attempt + Math.floor(Math.random() * 150));
      }
      if (!commitSha) throw failure();

      const url = (name: string) =>
        `https://github.com/${repo}/blob/${commitSha}/${directory}/${name}`;
      const first = String(
        submission.answers.summary ??
          submission.answers.general ??
          submission.answers.one_change ??
          "Demo feedback",
      );
      const title = plainTitle(`${submission.pathway}: ${first}`);
      const body = renderMarkdown(submission, audioNames.map(url), {
        maxLength: 59_000,
        recordUrl: url("submission.json"),
      });
      const demos = Array.isArray(submission.answers.demos) ? submission.answers.demos : [];
      const labels = [
        "feedback",
        `pathway:${submission.pathway}`,
        `mode:${submission.mode}`,
        ...demos.map((demo) => `demo:${demo}`),
        ...(submission.metadata.from ? [`from:${submission.metadata.from}`] : []),
      ];
      let issue = await call("/issues", "POST", { title, body, labels });
      // A token that may not create labels gets a 422: file the issue without them.
      if (issue.status === 422) issue = await call("/issues", "POST", { title, body });
      if (!issue.ok) {
        throw new FeedbackError(
          502,
          "Your feedback was saved but we couldn't create a reference. Download a copy before trying again.",
        );
      }
      const reference: unknown = ((await issue.json()) as { number?: unknown }).number;
      if (typeof reference !== "number" || !Number.isSafeInteger(reference) || reference < 1) {
        throw new FeedbackError(502, "We couldn't confirm your reference. Download a copy.");
      }
      return { reference };
    },
  };
}
