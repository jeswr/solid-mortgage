import { DEFAULT_HOSTNAME_DENYLIST } from "@jeswr/guarded-fetch";
import { PRISTINE_BASE } from "@jeswr/solid-auth-core";
import { DEFAULT_DB_NAME } from "@jeswr/solid-session-restore";
import { expect, test } from "vitest";
import { solidKitPackage } from "../src/index.js";

test("exports the package stub and loads the pinned Solid SDK modules", () => {
  expect(solidKitPackage).toBe("@mortgage/solid-kit");
  expect(DEFAULT_HOSTNAME_DENYLIST).toBeDefined();
  expect(PRISTINE_BASE).toBeDefined();
  expect(DEFAULT_DB_NAME).toBeTypeOf("string");
});
