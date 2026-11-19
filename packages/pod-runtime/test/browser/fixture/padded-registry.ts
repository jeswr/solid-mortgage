// AUTHORED-BY Claude Opus 5.5
/**
 * `@mortgage/demo-kit/registry` for the fixture page, with one change: `?pad=<n>` in the page URL
 * adds pod owners (`extra-01`, `extra-02`, …) until `podOwners` lists `n`. The registry grows with
 * every demo (organisations and holders), so the cold-start budget is held at a size the real
 * registry has not reached yet. With no `?pad`, the owners are the registry's own.
 */
import { podOwners as registryOwners } from "@mortgage/demo-kit/registry";

export * from "@mortgage/demo-kit/registry";

export function podOwners(
  ...args: Parameters<typeof registryOwners>
): ReturnType<typeof registryOwners> {
  const owners = registryOwners(...args);
  const pad = Number(new URLSearchParams(globalThis.location?.search ?? "").get("pad") ?? 0);
  for (let index = 1; owners.length < pad; index += 1) {
    owners.push(`extra-${String(index).padStart(2, "0")}` as (typeof owners)[number]);
  }
  return owners;
}
