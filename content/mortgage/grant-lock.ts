// AUTHORED-BY Claude Opus 5.5
/**
 * One writer at a time for a holder's grants. Approving, withdrawing and expiring each read the
 * grants on record and rewrite ACL documents from them; two interleaved could write a document
 * computed from a stale set (a withdrawn grant's rule written back, a new grant's rule lost).
 *
 * Every grant change in every demo takes this lock itself (`locked`), whichever page, agent
 * worker or test calls it. In the browser it is a Web Lock: every page and agent worker of the
 * site share one origin, so they queue behind each other. Where Web Locks are missing (Node), a
 * queue in this module serialises the callers of this realm.
 *
 * A Web Lock is not re-entrant, so the world an action receives carries a mark that it holds the
 * lock: a grant change called with that world (or a copy made by spreading it) runs at once
 * instead of waiting for itself. Code that holds the lock passes the world it was given on.
 */

/** The Web Lock's name. One lock for every holder: the wallet changes one holder at a time. */
export const GRANT_LOCK = "mortgage-alex-grants";

const HELD: unique symbol = Symbol.for("mortgage.grant-lock.held") as never;

let queue: Promise<unknown> = Promise.resolve();

/** True when `world` was handed out by {@link withGrantLock}: its holder holds the lock. */
export function holdsGrantLock(world: object): boolean {
  return (world as { [HELD]?: boolean })[HELD] === true;
}

/** Run `action` holding the grant lock, with a copy of `world` marked as holding it. */
export function withGrantLock<W extends object, T>(
  world: W,
  action: (world: W) => Promise<T>,
): Promise<T> {
  if (holdsGrantLock(world)) return action(world);
  const held = { ...world, [HELD]: true } as W;
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  if (locks !== undefined) return locks.request(GRANT_LOCK, () => action(held)) as Promise<T>;
  const run = queue.then(() => action(held));
  queue = run.catch(() => undefined);
  return run;
}

/** `change` taking the grant lock on its first argument, the world it changes grants in. */
export function locked<W extends object, A extends unknown[], T>(
  change: (world: W, ...args: A) => Promise<T>,
): (world: W, ...args: A) => Promise<T> {
  return (world, ...args) => withGrantLock(world, (held) => change(held, ...args));
}
