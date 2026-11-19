// AUTHORED-BY Claude Opus 5.5
/**
 * A fictional trail-expedition registry for the Lens fixtures. The registry type needs a record
 * for every app slug; the ones this story uses get trail organisations, the rest a placeholder.
 */
import {
  ORG_SLUGS,
  type OrgRecord,
  type OrgRegistry,
  type OrgSlug,
} from "@mortgage/demo-kit/registry";

export const ORIGIN = "https://trail.example";
export const webid = (owner: string) => `${ORIGIN}/pods/${owner}/profile/card#me`;

const STORY: Partial<Record<OrgSlug, Omit<OrgRecord, "slug" | "actsAs">>> = {
  wallet: {
    organisation: "Waymark",
    short: "Waymark",
    role: "Alex's pod app",
    persona: { name: "Alex" },
    themeColor: "#0f5c5a",
    title: "Waymark",
  },
  payroll: {
    organisation: "Tamarack Guides",
    short: "Tamarack",
    role: "First-aid course provider",
    persona: null,
    themeColor: "#3d3a8c",
    title: "Tamarack Guides",
  },
  bank: {
    organisation: "Sorrel Outfitters",
    short: "Sorrel",
    role: "Gear rental",
    persona: null,
    themeColor: "#6b2f6b",
    title: "Sorrel Outfitters",
  },
  bureau: {
    organisation: "Cobble Hut Network",
    short: "Cobble Huts",
    role: "Mountain huts",
    persona: null,
    themeColor: "#5b4a1f",
    title: "Cobble Hut Network",
  },
  aus: {
    organisation: "Kestrel Weather Desk",
    short: "Kestrel",
    role: "Mountain forecasts",
    persona: null,
    themeColor: "#0b5563",
    title: "Kestrel Weather Desk",
  },
  insurer: {
    organisation: "Ridgeline Rescue Cover",
    short: "Ridgeline",
    role: "Rescue cover",
    persona: null,
    themeColor: "#8a2c0f",
    title: "Ridgeline Rescue Cover",
  },
  county: {
    organisation: "Fernhollow Parks Service",
    short: "Fernhollow",
    role: "Backcountry permits",
    persona: { name: "Jo Park", role: "ranger" },
    themeColor: "#1f5135",
    title: "Fernhollow Parks Service",
  },
};

export const REGISTRY: OrgRegistry = Object.freeze(
  Object.fromEntries(
    ORG_SLUGS.map((slug, i) => {
      const story = STORY[slug];
      const record: OrgRecord = story
        ? { ...story, slug, actsAs: slug === "wallet" ? "alex" : slug }
        : {
            slug,
            actsAs: slug,
            organisation: `Placeholder organisation ${i + 1}`,
            short: `Placeholder ${i + 1}`,
            role: "Not part of the trail story",
            persona: null,
            themeColor: "#444444",
            title: `Placeholder ${i + 1}`,
          };
      return [slug, record];
    }),
  ) as Record<OrgSlug, OrgRecord>,
);

export const DRAWERS = [
  { path: "/profile/", label: "Profile" },
  { path: "/certificates/", label: "Certificates" },
  { path: "/itinerary/", label: "Itinerary" },
  { path: "/permits/", label: "Permits" },
  { path: "/health/", label: "Health" },
  { path: "/inbox/", label: "Inbox" },
];

export const GRANTS = {
  "/policies/t1": { label: "T1", purpose: "deliver the first-aid certificate", until: "7 days" },
  "/policies/t2": { label: "T2", purpose: "backcountry permit", until: "the trip ends" },
  "/policies/t3": { label: "T3", purpose: "rescue cover quote", until: "quote issued" },
};

export const CONFIG = {
  registry: REGISTRY,
  holder: { name: "Alex" },
  drawers: DRAWERS,
  grants: GRANTS,
  recordDrawers: ["/inbox/"],
};
