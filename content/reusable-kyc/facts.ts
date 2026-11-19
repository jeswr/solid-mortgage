// AUTHORED-BY Claude Opus 5.5
/**
 * The reusable-KYC scenario's fixed facts (flows.md section 8). Alex, a customer of Alder Bank
 * since 2019 and now living at 14 Larch Lane, applies for a card from Pennant. Everything here is
 * fictional: the people, the organisations, the scheme and its agreement reference.
 */
import { BORROWER, PROPERTY } from "../mortgage/facts.js";

/** The tour's demo id (`?tour=reusable-kyc`, `PodEvent.tour.demo`). */
export const DEMO = "reusable-kyc";

/**
 * Simulated days on the shared demo calendar, after the mortgage story. Day 75 is the latest day
 * that is always in the past (day 1 is at least 75 days ago), so the loss is reported the next day.
 */
export const DAY = Object.freeze({
  /** Alex asks Alder Bank for the attestation and applies to Pennant. */
  apply: 74,
  /** Alex reports the identity document lost; the bank withdraws and re-issues. */
  lost: 75,
});

/** Who the attestation is about: the mortgage demo's borrower, at the house Alex bought. */
export const SUBJECT = Object.freeze({
  address: PROPERTY.address,
  birthDate: BORROWER.birthDate,
  name: BORROWER.name,
});

/** The day Alex opened the account at Alder Bank, when the bank inspected a photo ID. */
export const ACCOUNT_OPENED = "2019-03-14";

/** How long an attestation is valid for (a fictional scheme rule). */
export const ATTESTATION_VALID_DAYS = 90;

/** The one-time grant: one read, within an hour of approval. */
export const GRANT_CODE = "Y1";
export const GRANT_WINDOW_MINUTES = 60;

/**
 * The fictional reliance scheme whose trusted-issuer list stands for the reliance agreement
 * between institutions (31 CFR 1020.220(a)(6) lets a bank rely on another financial
 * institution's identity checks only under conditions, including a contract between them).
 */
export const SCHEME = Object.freeze({
  agreement: "KRS-RA-0042",
  /** The demo day Alder Bank's entry took effect (calendar days, so the dates are always real). */
  bankListedDay: 1,
  /** The demo day this edition of the list was published, and how long it is in force. */
  listPublishedDay: 60,
  listValidDays: 365,
  name: "Keelstone Reliance Scheme",
});
