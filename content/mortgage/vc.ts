// AUTHORED-BY Claude Opus 5.5
/**
 * `@mortgage/vc-kit`, loaded the first time something signs, checks or proves.
 *
 * The kit brings the pinned `@jeswr/solid-vc`, RDF canonicalisation and the credential checks with
 * it. Pages load content modules at start-up, so a static import would put all of that in every
 * app's entry chunk (build-plan.md acceptance test 15). Content code reaches the kit's functions
 * through `await vcKit()` inside the async step that needs them, and imports only types statically.
 */

export type VcKit = typeof import("@mortgage/vc-kit");

let loading: Promise<VcKit> | undefined;

/** The kit's module, imported once. A failed import is retried on the next call. */
export function vcKit(): Promise<VcKit> {
  if (loading === undefined) {
    const pending = import("@mortgage/vc-kit");
    loading = pending;
    pending.catch(() => {
      if (loading === pending) loading = undefined;
    });
  }
  return loading;
}
