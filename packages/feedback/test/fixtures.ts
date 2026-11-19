// AUTHORED-BY Claude Opus 5.5
import type { Submission } from "../src/index.js";

/** A submission id, as the page makes it (a v4 UUID). */
export const ID = "7d4b5f9e-3c2a-4b1d-9e8f-0a1b2c3d4e5f";

export const SUBMISSION: Submission = {
  id: ID,
  pathway: "guided",
  mode: "questionnaire",
  answers: { demos: ["mortgage"], seq_mortgage: 6, one_change: "Shorter videos" },
  transcript: [],
  contact: { name: "", email: "" },
  metadata: { version: "test", from: "lender", userAgent: "vitest" },
};

export const ENV = {
  ANTHROPIC_API_KEY: "sk-test-key",
  FEEDBACK_GITHUB_TOKEN: "github_pat_test",
  FEEDBACK_GITHUB_REPO: "example/feedback",
  FEEDBACK_RECEIPT_SECRET: "receipt-secret",
} as const;
