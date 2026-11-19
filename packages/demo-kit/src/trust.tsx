// AUTHORED-BY Claude Opus 5.5
/**
 * Trust wiring over `@jeswr/solid-showcase-kit` (design.md §b.2, §d.3, §d.10). Every app renders
 * `<DemoTrust org={…}>` once at its root and `<TrustBanner />` at the top of every route,
 * including not-found pages. The kit's banner copy comes from one frozen disclaimer pack; this
 * module adds the line the kit does not have yet: "<Organisation> is a fictional organisation."
 */
import {
  type BrandingConfig,
  ConceptDemoBanner,
  createDisclaimerPack,
  type DisclaimerPack,
  ShowcaseTrustProvider,
} from "@jeswr/solid-showcase-kit";
import { type CSSProperties, createContext, type ReactNode, useContext } from "react";
import type { OrgRecord } from "./registry.js";
import { appSlugOfPath, appUrl } from "./urls.js";

/** The one branding config every app uses. Copy changes here reach every banner at once. */
export const DEMO_BRANDING: BrandingConfig = Object.freeze({
  consentCookiePrefix: "solid-mortgage-",
  convener: "EDMA Solid Community of Practice",
  description:
    "show what changes when the customer holds the data, inside processes data managers already run",
  domainNegations: [
    "Nothing here is a real offer of credit, insurance or any other financial product.",
  ],
}) as BrandingConfig;

/** The frozen disclaimer pack built from `DEMO_BRANDING`. Unit and e2e tests assert against it. */
export const demoPack: DisclaimerPack = createDisclaimerPack(DEMO_BRANDING);

/** The page that explains what is real and what is simulated (built by the welcome app). */
export const HONESTY_PATH = "honesty";

/** "Juniper Home Loans is a fictional organisation." */
export function fictionalLine(org: Pick<OrgRecord, "organisation">): string {
  return `${org.organisation} is a fictional organisation.`;
}

/** "Signed in as Priya Nair, processor (simulated)". */
export function signedInLine(persona: { name: string; role?: string }): string {
  return `Signed in as ${persona.name}${persona.role ? `, ${persona.role}` : ""} (simulated)`;
}

/** Title, description, robots and theme colour for an app's `index.html` and runtime updates. */
export interface DemoDocumentMeta {
  title: string;
  description: string;
  robots: "noindex, nofollow";
  themeColor: string;
}

export function demoDocumentMeta(org: OrgRecord, page?: string): DemoDocumentMeta {
  const title = page === undefined ? org.title : `${page} · ${org.title}`;
  return {
    description: `${fictionalLine(org)} ${demoPack.demoDescription({ appName: org.title, organization: org.organisation, variant: "own" })}`,
    robots: "noindex, nofollow",
    themeColor: org.themeColor,
    title,
  };
}

/** Apply `demoDocumentMeta` to the live document (title, theme-color, robots). Browser only. */
export function applyDocumentMeta(org: OrgRecord, page?: string): void {
  const meta = demoDocumentMeta(org, page);
  document.title = meta.title;
  for (const [name, content] of [
    ["theme-color", meta.themeColor],
    ["robots", meta.robots],
    ["description", meta.description],
  ] as const) {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (element === null) {
      element = document.createElement("meta");
      element.name = name;
      document.head.append(element);
    }
    element.content = content;
  }
}

const OrgContext = createContext<OrgRecord | null>(null);

export interface DemoTrustProps {
  org: OrgRecord;
  children: ReactNode;
}

/** Root provider: the disclaimer pack for the kit's components plus the app's registry record. */
export function DemoTrust({ org, children }: DemoTrustProps) {
  return (
    <ShowcaseTrustProvider pack={demoPack}>
      <OrgContext.Provider value={org}>{children}</OrgContext.Provider>
    </ShowcaseTrustProvider>
  );
}

/** The registry record of the app being rendered. Throws outside `<DemoTrust>` (fail closed). */
export function useDemoOrg(): OrgRecord {
  const org = useContext(OrgContext);
  if (org === null) throw new Error("useDemoOrg() needs a <DemoTrust org={…}> above it");
  return org;
}

const LINE_STYLE: CSSProperties = {
  background: "#1e293b",
  color: "#f8fafc",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontSize: "0.8125rem",
  lineHeight: 1.5,
  margin: 0,
  padding: "0.25rem 1rem 0.5rem",
  textAlign: "center",
};

const FEEDBACK_LINK_STYLE: CSSProperties = {
  color: "#bfdbfe",
  fontWeight: 600,
  marginLeft: "0.5rem",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
  whiteSpace: "nowrap",
};

/** The feedback page's slug; its own banner carries no link to itself. */
export const FEEDBACK_SLUG = "feedback";

/**
 * The URL of the feedback page, remembering which app the visitor came from (`from=<slug>`) so
 * the page can say so. Browser-only callers pass `window.location.pathname`.
 */
export function feedbackHref(pathname?: string): string {
  const from = pathname === undefined ? undefined : appSlugOfPath(pathname);
  return appUrl(FEEDBACK_SLUG, "", { from: from === FEEDBACK_SLUG ? undefined : from });
}

export interface TrustBannerProps {
  /** Overrides the persona from the registry (the engine passes the current session's). */
  signedInAs?: { name: string; role?: string } | null;
}

/**
 * The concept-demo banner, the fictional-organisation line and, when someone is shown as signed
 * in, the simulated sign-in line, then a "Give feedback" link to the feedback page (on every
 * route of every app: a plain link, so no app's first load grows). Its own inline styles, so it
 * renders even if app CSS fails.
 */
export function TrustBanner({ signedInAs }: TrustBannerProps) {
  const org = useDemoOrg();
  const persona = signedInAs === undefined ? org.persona : signedInAs;
  const pathname = typeof window === "undefined" ? undefined : window.location.pathname;
  const onFeedbackPage = pathname !== undefined && appSlugOfPath(pathname) === FEEDBACK_SLUG;
  return (
    <div data-demo-trust="">
      <ConceptDemoBanner
        aboutHref={appUrl("welcome", HONESTY_PATH)}
        organization={org.organisation}
        pack={demoPack}
        placement="static"
        variant="own"
      />
      <p data-demo-fictional="" style={LINE_STYLE}>
        {fictionalLine(org)}
        {persona === null ? null : (
          <>
            {" "}
            <span data-demo-signed-in="">{signedInLine(persona)}</span>
          </>
        )}
        {onFeedbackPage ? null : (
          <a data-demo-feedback="" href={feedbackHref(pathname)} style={FEEDBACK_LINK_STYLE}>
            Give feedback
          </a>
        )}
      </p>
    </div>
  );
}
