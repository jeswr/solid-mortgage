// AUTHORED-BY Claude Opus 5.5
import { ORGS } from "@mortgage/content/orgs";

export const org = ORGS.bureau;

/** The business-side persona (design.md: "a desk clerk (orders view)"). */
export const CLERK = org.altPersonas?.[0] ?? { name: "Order desk clerk", role: "orders view" };
