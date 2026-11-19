// AUTHORED-BY Claude Opus 5.5
/**
 * One writer at a time for Alex's grants. Approving, revoking and applying expiry each read the
 * grants on record and rewrite the ACL documents from them (content/mortgage/grants.ts). Two of
 * them interleaved could write a document computed from a stale set of grants: a new grant's
 * rule lost, or a withdrawn grant's rule written back. The wallet page and the wallet's agent
 * worker are on the same origin, so a Web Lock serialises them. The lock is content's
 * (content/mortgage/grant-lock.ts): every grant change takes it itself, and the world the page
 * hands an action is marked as holding it, so those changes run at once instead of waiting.
 */
export {
  GRANT_LOCK as ACL_LOCK,
  withGrantLock,
} from "@mortgage/content/mortgage/grant-lock";
