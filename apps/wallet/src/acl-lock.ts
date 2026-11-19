// AUTHORED-BY Claude Opus 5.5
/**
 * One writer at a time for Alex's grants. Approving, revoking and applying expiry each read the
 * grants on record and rewrite the ACL documents from them (content/mortgage/grants.ts). Two of
 * them interleaved could write a document computed from a stale set of grants: a new grant's
 * rule lost, or a withdrawn grant's rule written back. The wallet page and the wallet's agent
 * worker are on the same origin, so a Web Lock serialises them. Where Web Locks are missing the
 * page's own queue (src/runtime.tsx) still serialises the page.
 */
export const ACL_LOCK = "mortgage-alex-grants";

export function withGrantLock<T>(action: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  if (locks === undefined) return action();
  return locks.request(ACL_LOCK, action) as Promise<T>;
}
