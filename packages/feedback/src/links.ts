// AUTHORED-BY Claude Opus 5.5
/** The EDMA Solid Community of Practice: where a participant can carry on the conversation. */
export const COMMUNITY_LINKS = Object.freeze({
  forum: "https://edmconnect.edmcouncil.org/solidforum/home",
  meeting: "https://hub.edmcouncil.org/NC__Event?id=a0lVQ0000061alxYAA",
});

/** The status the page reads from `GET /api/feedback/status`: two booleans and nothing else. */
export interface FeedbackStatus {
  /** The LLM interviewer can run (an Anthropic API key is set). */
  interviewer: boolean;
  /** Submissions can be sent (a GitHub token and repository are set). */
  sending: boolean;
}

export const NOT_CONFIGURED: FeedbackStatus = Object.freeze({ interviewer: false, sending: false });
