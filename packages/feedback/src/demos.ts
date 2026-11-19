// AUTHORED-BY Claude Opus 5.5
/**
 * The demos a visitor can give feedback on, in the welcome page's order. A server-safe
 * projection of `apps/welcome/src/demos.ts` (ids and card titles only); the feedback app's tests
 * fail when the two drift, so adding a demo there means adding it here.
 */
export interface FeedbackDemo {
  /** The welcome page's demo id (`/welcome/watch/<id>`). */
  id: string;
  /** The demo card's title. */
  title: string;
}

export const FEEDBACK_DEMOS: readonly FeedbackDemo[] = Object.freeze([
  { id: "mortgage", title: "Buying a home" },
  { id: "moving-house", title: "Moving house" },
  { id: "medication-handover", title: "Medication handover" },
  { id: "motor-claim", title: "Motor claim" },
  { id: "business-kyb", title: "Business KYB with an LEI" },
  { id: "small-dollar-lending", title: "Small-dollar lending" },
  { id: "small-business-loan", title: "Small business loan" },
  { id: "reusable-kyc", title: "Reusable KYC" },
]);

export function isFeedbackDemo(id: string): boolean {
  return FEEDBACK_DEMOS.some((demo) => demo.id === id);
}
