// AUTHORED-BY Claude Opus 5.5
/**
 * One writer at a time for Alex's grants, whichever page or worker writes them. Approving,
 * withdrawing and expiring each read the grants on record and rewrite ACL documents from them;
 * two interleaved could write a document computed from a stale set. Every page of the site and
 * every agent worker share one origin, so a Web Lock serialises them. The name is the wallet's own
 * (`apps/wallet/src/acl-lock.ts`), so the insurer's and the repairer's pages queue behind the
 * wallet and the wallet's back office. Where Web Locks are missing (Node), the action runs as is.
 */
export const ALEX_GRANT_LOCK = "mortgage-alex-grants";

export function withAlexGrantLock<T>(action: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  if (locks === undefined) return action();
  return locks.request(ALEX_GRANT_LOCK, action) as Promise<T>;
}
