// AUTHORED-BY Claude Opus 5.5
import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import { describe, expect, it } from "vitest";
import { mortgageAliases } from "../vite.js";

describe("mortgageAliases", () => {
  it("maps each Node import solid-vc uses to an existing vc-kit stand-in", () => {
    const aliases = mortgageAliases();
    expect(Object.keys(aliases).sort()).toEqual([
      "@jeswr/guarded-fetch/node",
      "node:crypto",
      "node:zlib",
    ]);
    for (const path of Object.values(aliases)) {
      expect(isAbsolute(path)).toBe(true);
      expect(existsSync(path)).toBe(true);
    }
  });
});
