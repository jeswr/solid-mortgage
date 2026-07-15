import { DEFAULT_FORMAT } from "@jeswr/rdf-serialize";
import { expect, test } from "vitest";
import { dataModelPackage } from "../src/index.js";

test("exports the package stub and loads the pinned RDF serializer", () => {
  expect(dataModelPackage).toBe("@mortgage/data-model");
  expect(DEFAULT_FORMAT).toBeTypeOf("string");
});
