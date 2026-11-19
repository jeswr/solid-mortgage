/**
 * Branding constants (decision 0002; bead note R3): role-first framing only.
 * The organization name appears EXCLUSIVELY inside non-affiliation copy
 * ("this is not {org}", "modelled on {org}") rendered by the shared
 * disclaimer components. The Freddie Mac product name for this role's real
 * system is NEVER rendered anywhere in this app — name-use consent is a
 * separate, still-open human-gated item, so every surface stays role-based:
 * "automated underwriting service (AUS) — the Freddie Mac role in the GSE
 * model".
 */
export const site = {
  appName: "Automated Underwriting Service",
  organization: "Freddie Mac",
  /** Journey role (decision 0002): role-first framing everywhere. */
  role: "automated underwriting service",
} as const;
