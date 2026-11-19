// AUTHORED-BY Claude Opus 5.5
/**
 * The grep gate of build-plan.md (Brief L2): the tour and Lens engine packages are
 * domain-neutral, so no mortgage vocabulary and none of the mortgage demo's organisation names
 * may appear in them. Package scope names (`@mortgage/…`) are the only exception.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PACKAGES = ["lens", "tour"].map((p) =>
  fileURLToPath(new URL(`../../${p}/`, import.meta.url)),
);
const SKIP = new Set(["node_modules", "dist", "test-results", "playwright-report", ".turbo"]);
const EXT = /\.(ts|tsx|js|mjs|json|html|css|md)$/;
/** This file has to name the terms it bans. */
const SELF = fileURLToPath(import.meta.url);

const TERMS: RegExp[] = [
  /mortgage/i,
  /\bloans?\b/i,
  /lender/i,
  /borrow/i,
  /underwrit/i,
  /escrow/i,
  /apprais/i,
  /closing disclosure/i,
  /\bTRID\b/,
  /\bAPR\b/,
  /\bLTV\b/,
  /\bHMDA\b/,
  /\bRESPA\b/,
  /servicer|servicing/i,
  /amorti[sz]/i,
  /down payment/i,
  /homeowner/i,
  /title insurance/i,
  /credit (bureau|report|score|file)/i,
  /\bFICO\b/,
  /fannie|freddie/i,
  /\b(Juniper|Plumbline|Sextant|Castellan|Marigold|Wrenfield|Ledgerly|Quillon|Copperfield|Marlow|Cairn|Northfield)\b/,
];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}

describe("domain-neutral engine packages", () => {
  it("contain no mortgage terms", () => {
    const hits: string[] = [];
    for (const pkg of PACKAGES) {
      for (const file of files(pkg).filter((f) => f !== SELF)) {
        const lines = readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          const text = line.replaceAll("@mortgage/", "@scope/");
          for (const term of TERMS) {
            if (term.test(text)) hits.push(`${relative(join(pkg, ".."), file)}:${i + 1}: ${term}`);
          }
        });
      }
    }
    expect(hits).toEqual([]);
  });

  it("scans both packages", () => {
    for (const pkg of PACKAGES) expect(files(pkg).length).toBeGreaterThan(5);
  });
});
