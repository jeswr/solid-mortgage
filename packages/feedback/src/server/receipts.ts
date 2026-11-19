// AUTHORED-BY Claude Opus 5.5
/**
 * Signed receipts for uploaded recordings. A recording is stored as a Git blob when the visitor
 * presses Send, just before the submission; the upload answers with a receipt (blob SHA, size,
 * extension, expiry and an HMAC over those and the submission's id). Submit accepts only
 * receipts this service signed for that same submission, unexpired and unique, so a submission
 * can attach only blobs uploaded for it, never another submission's or any other object.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { RECEIPT_SHA, RECEIPT_SIG } from "../archive.js";
import { MAX_RECORDINGS } from "../validation.js";
import { type FeedbackEnv, FeedbackError } from "./security.js";

export const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
/** How long a receipt stays valid. */
export const RECEIPT_LIFETIME = 2 * 60 * 60 * 1000;

export const receiptSchema = z
  .object({
    sha: z.string().regex(RECEIPT_SHA),
    size: z.number().int().min(1).max(MAX_AUDIO_BYTES),
    ext: z.enum(["webm", "ogg", "m4a"]),
    // The expiry travels inside sig, so the receipt has exactly four fields.
    sig: z.string().regex(RECEIPT_SIG),
  })
  .strict();

export type SignedReceipt = z.infer<typeof receiptSchema>;
type Unsigned = Omit<SignedReceipt, "sig">;

/** The receipt key: `FEEDBACK_RECEIPT_SECRET`, else derived from the GitHub token. */
function signature(
  receipt: Unsigned,
  submission: string,
  expiry: number,
  env: FeedbackEnv,
): string {
  const secret = env.FEEDBACK_RECEIPT_SECRET?.trim() || env.FEEDBACK_GITHUB_TOKEN?.trim();
  if (!secret)
    throw new FeedbackError(503, "Sending feedback isn't switched on yet. Download a copy.");
  const key = createHmac("sha256", secret)
    .update(`solid-mortgage-feedback-receipts:v2:${env.FEEDBACK_GITHUB_REPO?.trim() ?? ""}`)
    .digest();
  return createHmac("sha256", key)
    .update(`${submission}|${receipt.sha}|${receipt.size}|${receipt.ext}|${expiry}`)
    .digest("hex");
}

export function signReceipt(
  receipt: Unsigned,
  submission: string,
  env: FeedbackEnv,
  now = Date.now(),
): SignedReceipt {
  const expiry = now + RECEIPT_LIFETIME;
  return {
    sha: receipt.sha,
    size: receipt.size,
    ext: receipt.ext,
    sig: `${expiry}.${signature(receipt, submission, expiry, env)}`,
  };
}

const INVALID = "A recording receipt is invalid or has expired. Download your feedback to keep it.";

export function verifyReceipts(
  input: unknown,
  submission: string,
  env: FeedbackEnv,
  now = Date.now(),
): SignedReceipt[] {
  const receipts = z.array(receiptSchema).max(MAX_RECORDINGS).parse(input);
  const seen = new Set<string>();
  for (const receipt of receipts) {
    const [timestamp = "", digest = ""] = receipt.sig.split(".");
    const expiry = Number(timestamp);
    const expected = Buffer.from(signature(receipt, submission, expiry, env), "hex");
    const given = Buffer.from(digest, "hex");
    const valid = expected.length === given.length && timingSafeEqual(expected, given);
    if (!valid || expiry <= now || expiry > now + RECEIPT_LIFETIME || seen.has(receipt.sha)) {
      throw new FeedbackError(400, INVALID);
    }
    seen.add(receipt.sha);
  }
  return receipts;
}
