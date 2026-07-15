import { ODRL_ACTIONS } from "@jeswr/solid-odrl";
import { VC_V2_CONTEXT } from "@jeswr/solid-vc";
import { expect, test } from "vitest";
import { vcKitPackage } from "../src/index.js";

test("exports the package stub and loads the pinned VC SDK modules", () => {
  expect(vcKitPackage).toBe("@mortgage/vc-kit");
  expect(VC_V2_CONTEXT).toBeTypeOf("string");
  expect(ODRL_ACTIONS).toBeDefined();
});
