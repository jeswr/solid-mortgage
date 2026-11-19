// AUTHORED-BY Claude Opus 5.5
/**
 * Plain words for what the pod holds: who an organisation is, what a pod path is, what a
 * permission allows and when a grant ends. Pure functions over values read from the pod (the
 * ODRL request or agreement, the consent records), so the consent and sharing screens explain a
 * grant from the policy actually stored, never from a hard-coded copy of it.
 */
import { ORGS, POD_HOLDER } from "@mortgage/content/orgs";
import { DPV, MORT } from "@mortgage/data-model";
import { ORG_SLUGS, type OrgSlug, type PodOwner } from "@mortgage/demo-kit/registry";

/** The pod owner a WebID belongs to (`<origin>/pods/<owner>/profile/card#me`), if any. */
export function ownerOfWebid(webid: string): PodOwner | undefined {
  let url: URL;
  try {
    url = new URL(webid);
  } catch {
    return undefined;
  }
  const match = /^\/pods\/([^/]+)\/profile\/card$/.exec(url.pathname);
  if (match === null || url.hash !== "#me") return undefined;
  const owner = match[1] as string;
  if (owner === POD_HOLDER.owner) return "alex";
  return ORG_SLUGS.some((slug) => ORGS[slug].actsAs === owner) ? (owner as PodOwner) : undefined;
}

/** The organisation app whose pod a WebID names (the first app acting as that owner). */
export function orgOfWebid(webid: string): OrgSlug | undefined {
  const owner = ownerOfWebid(webid);
  if (owner === undefined || owner === "alex") return undefined;
  return ORG_SLUGS.find((slug) => ORGS[slug].actsAs === owner);
}

/** A WebID as a name: "Juniper Home Loans", "you" for Alex, the WebID itself if unknown. */
export function nameOfWebid(webid: string): string {
  const owner = ownerOfWebid(webid);
  if (owner === "alex") return "you";
  const slug = orgOfWebid(webid);
  return slug === undefined ? webid : ORGS[slug].organisation;
}

/** Plain-word labels for the paths of Alex's pod (design.md section b.4). */
const PATH_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "": "the whole pod",
  "banking/": "Banking",
  "banking/payment-mandate": "Autopay instruction",
  "consents/": "Consent records",
  "consents/g4-credit-report-authorisation": "Credit report authorisation",
  "credentials/": "Credentials (income, assets, credit)",
  "credentials/assets": "Asset verification",
  "credentials/credit-summary": "Credit summary",
  "credentials/credit-summary-anchor": "Credit score proof anchor",
  "credentials/employment-income": "Employment and income verification",
  "credentials/employment-income-anchor": "Income proof anchor",
  "identity/": "Identity",
  "identity/identity-credential": "Identity credential",
  "inbox/": "Inbox",
  "insurance/": "Insurance",
  "insurance/evidence-of-insurance": "Evidence of insurance",
  "mortgage/": "Mortgage",
  "mortgage/closing/": "Closing documents",
  "mortgage/juniper/": "Loan documents from Juniper",
  "mortgage/juniper/appraisal": "Appraisal copy",
  "mortgage/servicing/": "Servicing documents",
  "policies/": "Sharing agreements",
  "profile/": "Profile (name and contact details)",
  "profile/card": "Name and public profile",
  "profile/contact": "Contact details",
  "property/": "Property",
  "property/purchase-agreement": "Purchase agreement",
  "property/subject-property": "Property details",
});

function humanise(segment: string): string {
  const words = segment.replace(/[-_]+/g, " ").trim();
  return words === "" ? segment : words.charAt(0).toUpperCase() + words.slice(1);
}

/** The label of a pod-relative path ("credentials/assets" → "Asset verification"). */
export function labelOfPath(path: string): string {
  const clean = path.replace(/^\/+/, "");
  const known = PATH_LABELS[clean];
  if (known !== undefined) return known;
  const segments = clean.replace(/\/$/, "").split("/");
  return humanise(segments.at(-1) ?? clean);
}

/** The pod-relative path of an absolute URL in `owner`'s pod, or undefined if it is elsewhere. */
export function podPathOf(url: string, podRoot: string): string | undefined {
  return url.startsWith(podRoot) ? url.slice(podRoot.length) : undefined;
}

/** Join labels as an English list: "A", "A and B", "A, B and C". */
export function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export type ModeName = "Read" | "Write" | "Append";

/** What a set of WAC modes allows on one target, as a verb phrase. */
export function verbOf(modes: readonly ModeName[], container: boolean): string {
  const read = modes.includes("Read");
  const write = modes.includes("Write");
  const append = modes.includes("Append");
  if (read && write) return container ? "read and add documents to" : "read and replace";
  if (read) return "read";
  if (write) return container ? "add and replace documents in" : "write";
  if (append) return container ? "add new documents to" : "add to";
  return "do nothing with";
}

/** The part of a permission the explanation needs: who, which targets, which modes. */
export interface PermissionView {
  readonly assignee: string;
  readonly targets: readonly string[];
  readonly modes: readonly ModeName[];
}

export interface PermissionSentence {
  readonly who: string;
  /** "may read Identity and Property" */
  readonly text: string;
  /** The labels of the targets, in order. */
  readonly what: readonly string[];
  /** True for an onward recipient (not the organisation that asked). */
  readonly onward: boolean;
}

/**
 * One sentence per permission: "Juniper Home Loans may read Profile, Identity and Property."
 * Targets outside Alex's pod are named by URL, so nothing is hidden by the labelling.
 */
export function explainPermissions(
  permissions: readonly PermissionView[],
  mainAssignee: string,
  podRoot: string,
): PermissionSentence[] {
  return permissions.map((permission) => {
    const what = permission.targets.map((target) => {
      const path = podPathOf(target, podRoot);
      return path === undefined ? target : labelOfPath(path);
    });
    const container = permission.targets.every((target) => target.endsWith("/"));
    return {
      onward: permission.assignee !== mainAssignee,
      text: `may ${verbOf(permission.modes, container)} ${listOf(what)}`,
      what,
      who: nameOfWebid(permission.assignee),
    };
  });
}

/** Plain words for an end event of `mort:GrantEndScheme`. */
const END_EVENTS: Readonly<Record<string, string>> = Object.freeze({
  [MORT.GrantEnd_Closing]: "Until closing",
  [MORT.GrantEnd_PolicyIssued]: "Until the owner's title policy is issued",
  [MORT.GrantEnd_PolicyLapses]: "While the insurance policy is in force",
  [MORT.GrantEnd_ReportDelivered]: "Until the appraisal report is delivered",
  [MORT.GrantEnd_ServicingEnds]: "While this servicer services the loan",
});

export type EndView = { until: Date } | { event: string } | undefined;

/** A calendar the screens use for simulated dates (a subset of the demo calendar). */
export interface DayLabeler {
  dayOf(date: string): number;
  label(day: number): string;
}

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

/** "Until Day 63 · Mon", "Until closing", or "No end date given". */
export function explainEnd(end: EndView, calendar: DayLabeler): string {
  if (end === undefined) return "No end date given";
  if ("until" in end) return `Until ${calendar.label(calendar.dayOf(dateOnly(end.until)))}`;
  return END_EVENTS[end.event] ?? `Until ${end.event}`;
}

/** The earliest end among a policy's permissions (they normally share one). */
export function endOfPermissions(ends: readonly EndView[]): EndView {
  const fixed = ends.filter((end): end is { until: Date } => end !== undefined && "until" in end);
  if (fixed.length > 0) {
    return fixed.reduce((a, b) => (a.until.getTime() <= b.until.getTime() ? a : b));
  }
  return ends.find((end) => end !== undefined);
}

/** Plain words for a DPV purpose IRI. */
export function explainPurpose(purpose: string | undefined): string {
  if (purpose === DPV.ServiceProvision) return "To provide the service you asked for";
  if (purpose === DPV.CreditChecking) return "To check your credit";
  return purpose ?? "No purpose given";
}

export type ConsentState = "given" | "withdrawn" | "expired";

/** The consent status IRI of a receipt as a state name. */
export function consentState(status: string): ConsentState {
  if (status === DPV.ConsentGiven) return "given";
  if (status === DPV.ConsentExpired) return "expired";
  return "withdrawn";
}

/** "Given", "Withdrawn by you", "Ended (applied by your wallet)". */
export function explainConsentState(state: ConsentState): string {
  if (state === "given") return "Given";
  if (state === "expired") return "Ended, applied by your wallet";
  return "Withdrawn by you";
}

/** The state of a grant (from `grantRecords`) as the sharing screen says it. */
export function explainGrantState(state: "active" | "expired" | "revoked"): string {
  if (state === "active") return "Active";
  if (state === "expired") return "Ended";
  return "Withdrawn";
}

/**
 * Where to send the visitor after a consent decision. Only a URL that is an app of this site
 * (path mode: same origin and a known app slug as the first segment; host mode: a known app's
 * own host) is accepted. Anything else, including a scheme other than http(s), is refused.
 */
export function safeReturnUrl(
  value: string | null,
  here: { origin: string; hostname: string },
  isAppSlug: (slug: string) => boolean,
): string | undefined {
  if (value === null || value === "") return undefined;
  let url: URL;
  try {
    url = new URL(value, here.origin);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  if (url.username !== "" || url.password !== "") return undefined;
  if (url.origin === here.origin) {
    const first = url.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    return isAppSlug(first) ? url.href : undefined;
  }
  // Host mode: <slug>.<domain>, where the wallet itself is wallet.<domain>.
  const domain = here.hostname.split(".").slice(1).join(".");
  const [label, ...rest] = url.hostname.split(".");
  if (domain === "" || rest.join(".") !== domain || label === undefined) return undefined;
  if (url.protocol !== new URL(here.origin).protocol) return undefined;
  return isAppSlug(label) ? url.href : undefined;
}

/** The app slug a URL that passed `safeReturnUrl` points at (path or host mode). */
export function slugOfReturnUrl(value: string, here: { origin: string }): string {
  const url = new URL(value, here.origin);
  if (url.origin === here.origin) return url.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  return url.hostname.split(".")[0] ?? "";
}
