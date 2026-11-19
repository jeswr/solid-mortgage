// AUTHORED-BY Claude Opus 5.5
/**
 * The "Download my feedback" archive: `submission.json` (the record exactly as it would be sent),
 * `feedback.md` (the readable version) and any voice recordings. Browser-safe.
 */
import { renderMarkdown } from "./markdown.js";
import type { Submission } from "./validation.js";
import { zipStore } from "./zip.js";

export const ARCHIVE_NAME = "solid-mortgage-feedback.zip";

export type AudioExt = "webm" | "ogg" | "m4a";

/** The file extension stored for a recording of this MIME type. */
export function audioExt(mimeType: string): AudioExt {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export interface ArchiveClip {
  bytes: Uint8Array;
  type: string;
}

export function feedbackArchive(
  submission: Submission,
  clips: readonly ArchiveClip[] = [],
  date = new Date(),
): Uint8Array {
  const encoder = new TextEncoder();
  const names = clips.map((clip, i) => `audio-${i + 1}.${audioExt(clip.type)}`);
  const files: Record<string, Uint8Array> = {
    "submission.json": encoder.encode(`${JSON.stringify(submission, null, 2)}\n`),
    "feedback.md": encoder.encode(`${renderMarkdown(submission, names)}\n`),
  };
  clips.forEach((clip, i) => {
    files[names[i] as string] = clip.bytes;
  });
  return zipStore(files, date);
}

/** The shape of a signed recording receipt (the server verifies the signature itself). */
export interface AudioReceipt {
  sha: string;
  size: number;
  ext: AudioExt;
  /** `<expiry ms>.<hex HMAC>`. */
  sig: string;
}

export const RECEIPT_SHA = /^[a-f0-9]{40,64}$/;
export const RECEIPT_SIG = /^\d{13}\.[a-f0-9]{64}$/;

/** Whether a value looks like a receipt for a clip of `size` bytes (a client-side sanity check). */
export function isReceiptFor(value: unknown, size: number): value is AudioReceipt {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.sha === "string" &&
    RECEIPT_SHA.test(r.sha) &&
    r.size === size &&
    (r.ext === "webm" || r.ext === "ogg" || r.ext === "m4a") &&
    typeof r.sig === "string" &&
    RECEIPT_SIG.test(r.sig)
  );
}
