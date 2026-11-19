// AUTHORED-BY Claude Opus 5.5
import type { OrgRecord } from "@mortgage/demo-kit/registry";

/**
 * The registry record this app renders as. A real app uses its own entry:
 *
 *   import { ORGS } from "@mortgage/content/orgs";
 *   export const org = ORGS["<slug>"];
 *
 * The template is not an organisation, so it carries a stand-in record.
 */
export const org: OrgRecord = {
  actsAs: "county",
  organisation: "Example Organisation",
  persona: { name: "Sample Persona", role: "example role" },
  role: "Template for organisation apps",
  short: "Example",
  slug: "county",
  themeColor: "#5B4B8A",
  title: "App template",
};
