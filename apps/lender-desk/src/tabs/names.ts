// AUTHORED-BY Claude Opus 5.5
import { ORGS } from "@mortgage/content/orgs";
import { isOrgSlug } from "@mortgage/demo-kit/registry";

/** The organisation behind a WebID of the `/pods/<owner>/profile/card#me` shape. */
export function issuerName(webid: string): string {
  const owner = /\/pods\/([^/]+)\/profile\/card#me$/.exec(webid)?.[1];
  if (owner === "alex") return "Alex Rivera";
  return owner !== undefined && isOrgSlug(owner) ? ORGS[owner].organisation : webid;
}
