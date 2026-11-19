// AUTHORED-BY Claude Opus 5.5
/**
 * Fixed copy from design.md §e and §d.3. Tests assert these strings, so they live in one place.
 */
import { demoPack } from "@mortgage/demo-kit/trust";

export const HEADLINE = "See what changes when the customer holds the data.";

/** design.md §e item 1, verbatim. */
export const EXPLAINER =
  "Solid is an open standard, now being standardised at the W3C, for keeping data in a pod: a web-addressable store that belongs to the person or business the data is about. Applications do not import copies. They ask for access to named resources, and the owner grants it for a stated purpose and period, and can withdraw it. For a data manager that turns the usual model around: one authoritative copy at the source, access policy attached to the data instead of rebuilt in every system, shared vocabularies such as FIBO so a field means the same to every reader, and a record of who read what. These demos show that model inside processes you already run.";

/** design.md §d.3: the honesty statement, in these words. */
export const HONESTY_STATEMENT =
  "Sign-in is simulated; access control is real (the pod server checks each request against the access rules for that organisation); everything runs in your browser and nothing is sent to a server.";

export const FOOTER_LINE = demoPack.footerLegalLine({ organization: "", variant: "own" });

/** design.md §e item 5: four lines, real on one side, simulated on the other. */
export const REAL = [
  {
    title: "Real pod server",
    body: "An open-source Solid server, compiled to WebAssembly, answers every request in your browser.",
  },
  {
    title: "Real access control",
    body: "Each request is checked against the access rules for the organisation making it. A refused read is a real 403.",
  },
  {
    title: "Real signatures and proofs",
    body: "Credentials are W3C Verifiable Credentials, signed and verified in your browser; threshold proofs are checked, not mocked.",
  },
] as const;

export const SIMULATED = [
  {
    title: "Simulated sign-in",
    body: "There is no identity provider. Each app says who it acts as, and the banner marks it as simulated.",
  },
  {
    title: "Simulated organisations and people",
    body: "Every organisation and person is fictional, and so are their data.",
  },
  {
    title: "Nothing leaves your browser",
    body: "The site is static files. Pods, keys and records stay in this browser until you clear them.",
  },
] as const;
