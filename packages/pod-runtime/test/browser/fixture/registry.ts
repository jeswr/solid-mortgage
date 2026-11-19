// AUTHORED-BY Claude Opus 5.5
/** Fixture registry for the browser tests: every app acts as itself, the wallet as alex. */
import {
  ORG_SLUGS,
  type OrgRecord,
  type OrgRegistry,
  type OrgSlug,
} from "@mortgage/demo-kit/registry";

const record = (slug: OrgSlug): OrgRecord => ({
  actsAs: slug === "wallet" ? "alex" : slug,
  organisation: `Org ${slug}`,
  persona: { name: "Test Person", role: "tester" },
  role: "test",
  short: slug,
  slug,
  themeColor: "#336699",
  title: slug,
});

export const ORGS = Object.fromEntries(
  ORG_SLUGS.map((slug) => [slug, record(slug)]),
) as OrgRegistry;
