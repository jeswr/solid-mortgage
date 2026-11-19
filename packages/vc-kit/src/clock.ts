// AUTHORED-BY Claude Fable 5.2
/**
 * The demo calendar as vc-kit's clock (design.md section d.7).
 *
 * Nothing in this package reads the wall clock: issue, verify, status and
 * re-issue all take explicit instants. These helpers derive those instants
 * from a demo calendar day, so a credential issued on demo day 1 and checked
 * on demo day 31 carries and is judged by the story's dates, whatever the
 * visitor's real date is. `DayClock` is structural: the calendar from
 * `@mortgage/demo-kit/calendar` satisfies it without this package depending
 * on demo-kit.
 */

import type { ValidityWindow } from "./issue.js";

/** The part of the demo calendar vc-kit needs. */
export interface DayClock {
  /** The instant of demo day `day` at local `time` ("HH:MM"), as a `Date`. */
  clock(day: number, time?: string): Date;
}

export interface ValidityOnOptions {
  /** Time of day the credential is issued, "HH:MM". */
  readonly time?: string;
  /** Days the credential stays valid, counted on the demo calendar. Omit for no end. */
  readonly validDays?: number;
}

/** A validity window that starts on demo day `day`. */
export function validityOn(
  clock: DayClock,
  day: number,
  options: ValidityOnOptions = {},
): ValidityWindow {
  const validFrom = instantOn(clock, day, options.time);
  if (options.validDays === undefined) return { validFrom };
  if (!Number.isInteger(options.validDays) || options.validDays <= 0) {
    throw new RangeError(`validDays must be a positive whole number: ${options.validDays}`);
  }
  return { validFrom, validUntil: instantOn(clock, day + options.validDays, options.time) };
}

/** The `now` to verify against on demo day `day`. */
export function instantOn(clock: DayClock, day: number, time?: string): Date {
  const instant = time === undefined ? clock.clock(day) : clock.clock(day, time);
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
    throw new RangeError(`the clock returned no valid instant for day ${day}`);
  }
  return instant;
}
