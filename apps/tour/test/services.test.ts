import { expect, test } from "vitest";
import {
  centerService,
  demoApps,
  launcherApps,
  roleServices,
  services,
} from "../app/content/services";

/** Env names must stay in lock-step with the shell rewrites in apps/tour/next.config.ts. */
const SHELL_ZONE_ENVS: Record<string, string> = {
  "/closing": "MORTGAGE_CLOSING_ZONE_URL",
  "/gse": "MORTGAGE_UNDERWRITING_ZONE_URL",
  "/lender-53": "MORTGAGE_COMPARISON_LENDER_ZONE_URL",
  "/lender-boa": "MORTGAGE_PRIMARY_LENDER_ZONE_URL",
  "/property": "MORTGAGE_PROPERTY_ZONE_URL",
  "/verifications": "MORTGAGE_VERIFICATIONS_ZONE_URL",
  "/wallet": "MORTGAGE_WALLET_ZONE_URL",
};

test("the map covers exactly the twelve org-map roles plus the borrower's vault", () => {
  expect(roleServices).toHaveLength(12);
  expect(
    roleServices.map((service) => service.roleNumber).sort((a, b) => (a ?? 0) - (b ?? 0)),
  ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(centerService.center).toBe(true);
  expect(centerService.apps).toContain("wallet");
  expect(services).toHaveLength(13);
  expect(new Set(services.map((service) => service.slug)).size).toBe(13);
});

test("every role launch targets a registered demo app", () => {
  for (const service of services) {
    for (const slug of service.apps) {
      expect(demoApps[slug], `${service.slug} → ${slug}`).toBeDefined();
    }
  }
});

test("zone apps carry the shell rewrite env and probe their own zone's health route", () => {
  for (const app of Object.values(demoApps)) {
    if (app.zoneEnv !== undefined) {
      expect(app.zoneEnv, app.slug).toBe(SHELL_ZONE_ENVS[app.path]);
      expect(app.healthPath, app.slug).toBe(`${app.path}/api/health`);
    } else {
      // Tour-local surfaces probe the shell's own health route.
      expect(app.healthPath, app.slug).toBe("/api/health");
    }
  }
});

test("the launcher dock lists all eight apps, shell first, no duplicates", () => {
  expect(launcherApps).toHaveLength(8);
  expect(launcherApps[0].slug).toBe("tour");
  expect(new Set(launcherApps.map((app) => app.path)).size).toBe(8);
  // Every zone the shell rewrites to is represented in the dock.
  const dockPaths = new Set(launcherApps.map((app) => app.path));
  for (const zonePath of Object.keys(SHELL_ZONE_ENVS)) {
    expect(dockPaths.has(zonePath), zonePath).toBe(true);
  }
});

test("each mapped-but-unbuilt seat says so via an empty app list, never a fake link", () => {
  const unbuilt = roleServices.filter((service) => service.apps.length === 0);
  expect(unbuilt.map((service) => service.slug).sort()).toEqual([
    "insurance",
    "org-identity",
    "standards",
  ]);
});
