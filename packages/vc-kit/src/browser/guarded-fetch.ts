// AUTHORED-BY Claude Fable 5.2
/**
 * Browser stand-in for `@jeswr/guarded-fetch/node`, which the pinned
 * `@jeswr/solid-vc` build imports dynamically as its default fetch when a
 * caller supplies none. That module needs Node's DNS and socket APIs.
 *
 * In the browser every vc-kit call that reaches the network is given an
 * explicit fetch (the pod runtime's). If one is ever missing, this stand-in
 * fails closed instead of falling back to an unguarded global fetch.
 */

export function createNodeGuardedFetch(): typeof fetch {
  return () =>
    Promise.reject(
      new Error(
        "no fetch was supplied: in a browser, vc-kit needs an explicit fetch for every " +
          "status list and key lookup",
      ),
    );
}
