import { ODRL_ACTIONS } from "@jeswr/solid-odrl";
import { VC_V2_CONTEXT } from "@jeswr/solid-vc";
import { expect, test } from "vitest";
import {
  checkCredentialStatus,
  deriveStatusIndex,
  isFresh,
  issueCredential,
  reissueCredential,
  StatusIndexAllocator,
  StatusListClient,
  verifyCredential,
} from "../src/index.js";

test("the vc-kit surface and the pinned VC SDK modules load", () => {
  expect(issueCredential).toBeTypeOf("function");
  expect(verifyCredential).toBeTypeOf("function");
  expect(checkCredentialStatus).toBeTypeOf("function");
  expect(reissueCredential).toBeTypeOf("function");
  expect(isFresh).toBeTypeOf("function");
  expect(deriveStatusIndex).toBeTypeOf("function");
  expect(StatusListClient).toBeTypeOf("function");
  expect(StatusIndexAllocator).toBeTypeOf("function");
  expect(VC_V2_CONTEXT).toBeTypeOf("string");
  expect(ODRL_ACTIONS).toBeDefined();
});
