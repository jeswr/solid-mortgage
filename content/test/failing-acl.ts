// AUTHORED-BY Claude Opus 5.5
/**
 * A world in which the pod answers one of the holder's ACL document requests with 503, for the
 * tests that pin the order a grant ends in: the ACL documents first, the consent record that
 * says the grant ended only once they are written (`endGrantInOrder`, content/mortgage/grants.ts).
 */

import type { PodOwner } from "@mortgage/demo-kit/registry";
import type { World } from "../mortgage/world.js";

export function failingAcl(
  world: World,
  holder: PodOwner,
  method: "GET" | "PUT",
): { world: World; failed: () => number } {
  let failed = 0;
  return {
    failed: () => failed,
    world: {
      ...world,
      fetchAs: (owner) => {
        const real = world.fetchAs(owner);
        if (owner !== holder) return real;
        return (async (input: RequestInfo | URL, init?: RequestInit) => {
          const isAcl = String(input).endsWith(".acl");
          if (failed === 0 && isAcl && (init?.method ?? "GET") === method) {
            failed++;
            return new Response(null, { status: 503 });
          }
          return real(input, init);
        }) as typeof fetch;
      },
    },
  };
}
