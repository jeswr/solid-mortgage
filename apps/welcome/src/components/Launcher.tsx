// AUTHORED-BY Claude Opus 5.5
/**
 * Every organisation app for free play (design.md §e item 4), each tile in that app's own
 * registry colour. The text colour is computed for contrast, never picked by hand.
 */
import { ORGS } from "@mortgage/content/orgs";
import { displayName, ORG_SLUGS } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import type { CSSProperties } from "react";
import { textOn } from "../colour.ts";
import { ArrowIcon } from "./icons.tsx";

export function Launcher() {
  return (
    <ul className="launcher" aria-label="Organisation apps">
      {ORG_SLUGS.map((slug) => {
        const org = ORGS[slug];
        const style = {
          "--tile-bg": org.themeColor,
          "--tile-fg": textOn(org.themeColor),
        } as CSSProperties;
        return (
          <li key={slug} className="launcher__item">
            <a className="tile" href={appUrl(slug)} style={style} data-app={slug}>
              <span className="tile__monogram" aria-hidden="true">
                {org.short.slice(0, 1)}
              </span>
              <span className="tile__name">{displayName(org)}</span>
              <span className="tile__role">{org.role}</span>
              <span className="tile__open">
                Open app <ArrowIcon />
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
