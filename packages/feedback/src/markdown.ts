// AUTHORED-BY Claude Opus 5.5
/**
 * The human-readable feedback record: the Markdown in a download, the `summary.md` stored beside
 * each submission and the body of its GitHub issue. Every participant string is escaped, so a
 * submission cannot mention people, link out, inject HTML or restructure the document.
 */
import { FEEDBACK_DEMOS } from "./demos.js";
import { displayAnswer, QUESTIONS, questionById } from "./guide.js";
import type { Submission } from "./validation.js";

/**
 * Neutralise mentions, HTML, links and Markdown structure in participant text. Every character
 * that can open a heading, list, quote or setext underline (`#`, `=`, `-`, `+`, `>`, digits'
 * `.`) is escaped wherever it appears, so no line of participant text can restructure the record.
 */
export function escapeMarkdown(value: unknown): string {
  const plain = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return plain
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/@/g, "@‍")
    .replace(/[\\`*_{}[\]()#+.!|~=-]/g, "\\$&")
    .replace(/\r?\n/g, "<br>\n");
}

/** A GitHub issue title: plain text, one line, no control characters, no mentions. */
export function plainTitle(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/@/g, "@‍")
    .trim()
    .slice(0, 80);
}

const RATING_IDS = ["lens_clear", "credibility", "umux_capabilities", "umux_ease", "likelihood"];

export interface RenderOptions {
  /** Cut the record to this many characters (GitHub issue bodies are capped). */
  maxLength?: number;
  /** A link to the full JSON record, appended at the end. */
  recordUrl?: string;
}

export function renderMarkdown(
  s: Submission,
  audio: readonly string[] = [],
  options: RenderOptions = {},
): string {
  const a = s.answers;
  const label = (id: string) => questionById(id)?.text ?? id;
  const value = (id: string) => escapeMarkdown(displayAnswer(questionById(id), a[id]));
  const section = (title: string, ids: readonly string[]) => {
    const present = ids.filter((id) => a[id] !== undefined);
    if (present.length === 0) return `## ${title}\n\nNo answers.`;
    return `## ${title}\n\n${present
      .map((id) => `**${escapeMarkdown(label(id))}**\n\n${value(id)}`)
      .join("\n\n")}`;
  };
  const ratingIds = [...FEEDBACK_DEMOS.map((demo) => `seq_${demo.id}`), ...RATING_IDS].filter(
    (id) => a[id] !== undefined,
  );
  const demoIds = FEEDBACK_DEMOS.flatMap((demo) => [`recall_${demo.id}`, `seq_reason_${demo.id}`]);
  const known = new Set([...QUESTIONS.map((q) => q.id), "summary"]);
  const sections = [
    `# ${s.pathway === "guided" ? "Guided feedback" : "Quick note"} (${s.mode === "interview" ? "interviewer" : "questionnaire"})`,
    `## Read-back\n\n${escapeMarkdown(a.summary ?? "Sent without a read-back.")}\n\nConfirmed: ${a.confirmed === "yes" ? "yes" : "no"}`,
    `Demos seen: ${value("demos") || "not recorded"}`,
    ratingIds.length === 0
      ? "## Ratings\n\nNo ratings."
      : `## Ratings\n\n| Measure | Rating |\n| --- | --- |\n${ratingIds
          .map((id) => `| ${escapeMarkdown(label(id))} | ${value(id)} |`)
          .join("\n")}`,
    section("About them", ["context_role", "context_org", "context_solid", "demo_mode"]),
    section("Solid's role and critical incidents", [
      "lens_unclear",
      "incident_best",
      "incident_stuck",
    ]),
    section("For their organisation", ["org_fit", "org_needs", "org_blockers"]),
    section("Values and ladders", [
      "values_control",
      "values_privacy",
      "values_trust",
      "values_tradeoff",
      "values_ladders",
    ]),
    section("Demo recall", demoIds),
    section("One change, community and comments", [
      "one_change",
      "community",
      "general",
      "comments",
    ]),
    `## Contact\n\n${escapeMarkdown(s.contact.name || "Anonymous")} ${escapeMarkdown(s.contact.email)}`,
    `## Client\n\nVersion: ${escapeMarkdown(s.metadata.version)}\n\nCame from: ${escapeMarkdown(s.metadata.from || "not recorded")}\n\nUser agent: ${escapeMarkdown(s.metadata.userAgent)}`,
    audio.length === 0
      ? "## Recordings\n\nNone."
      : `## Recordings\n\n${audio.map((url, i) => `- [Audio ${i + 1}](${url})`).join("\n")}`,
  ];
  // Every answer id is one the guide knows; this guards a future field from being dropped silently.
  const unknown = Object.keys(a).filter((id) => !known.has(id));
  if (unknown.length > 0) sections.push(section("Other answers", unknown));

  const ending = options.recordUrl
    ? `\n\nFull record: [submission.json](${options.recordUrl})`
    : "";
  const opening = "<details>\n<summary>Full transcript</summary>\n\n";
  const closing = "\n\n</details>";
  const omitted = "\n\n[Truncated; the full record holds every answer and the whole transcript.]";
  const max = options.maxLength ?? Number.POSITIVE_INFINITY;
  const prefix = sections.join("\n\n");
  const prefixBudget = Math.max(
    0,
    max - ending.length - opening.length - closing.length - omitted.length - 1000,
  );
  const boundedPrefix =
    prefix.length > prefixBudget ? `${prefix.slice(0, prefixBudget)}${omitted}` : prefix;
  const transcript =
    s.transcript.length === 0
      ? "No transcript (the plain questionnaire was used)."
      : s.transcript
          .map(
            (m) =>
              `**${m.role === "user" ? "Participant" : "Interviewer"}**: ${escapeMarkdown(m.content)}${
                m.audio?.length ? ` (audio ${m.audio.map((i) => i + 1).join(", ")})` : ""
              }`,
          )
          .join("\n\n");
  const budget = Math.max(
    0,
    max -
      boundedPrefix.length -
      2 -
      opening.length -
      closing.length -
      ending.length -
      omitted.length,
  );
  const boundedTranscript =
    transcript.length > budget ? `${transcript.slice(0, budget)}${omitted}` : transcript;
  return [boundedPrefix, `${opening}${boundedTranscript}${closing}${ending}`].join("\n\n");
}
