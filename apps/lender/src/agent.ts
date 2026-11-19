// AUTHORED-BY Claude Opus 5.5
/**
 * Juniper's back-office agent (design.md §d.2). The borrower portal and the Loan Desk act as the
 * same pod (`lender`), so both apps' agents see every message in Juniper's inbox. The
 * organisation-to-organisation deliveries (credit report, findings, appraisal, commitment,
 * refresh, closing, purchase) are the Loan Desk's work and its agent wraps the matching
 * `agents.*` functions. No `agents.*` function belongs to the borrower portal, so it registers no
 * handler and never answers a message twice.
 */
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({});
