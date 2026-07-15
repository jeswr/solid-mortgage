// @vitest-environment jsdom

import { cn } from "@jeswr/app-shell";
import { DEFAULT_HOSTNAME_DENYLIST } from "@jeswr/guarded-fetch";
import { DataController } from "@jeswr/solid-components";
import { expect, test } from "vitest";
import { ConceptDemoBanner, uiPackage } from "../src/index.js";

test("exports the package stub and loads the pinned UI SDK modules", () => {
  expect(uiPackage).toBe("@mortgage/ui");
  expect(cn).toBeTypeOf("function");
  expect(DEFAULT_HOSTNAME_DENYLIST).toBeDefined();
  expect(DataController).toBeTypeOf("function");
  expect(ConceptDemoBanner).toBeTypeOf("function");
});
