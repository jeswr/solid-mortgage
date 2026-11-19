// AUTHORED-BY Claude Opus 5.5
/**
 * The motor claim's fixed facts (flows.md section 7). Alex's car is reversed into in a car park
 * some weeks after the move. Every person, organisation, vehicle and number here is fictional:
 * the vehicle identification number contains the letter O, which no real one uses, and the
 * telephone number is in the 555-0100 to 555-0199 range kept for fiction.
 */
import { DAY as MORTGAGE_DAY } from "../mortgage/facts.js";

/** The tour's demo id (`?tour=motor-claim`, `PodEvent.tour.demo`). */
export const DEMO = "motor-claim";

/** Simulated days on the shared calendar: six weeks after closing, then the repair week. */
export const DAY = Object.freeze({
  /** The bump, the claim file and the report to the insurer. */
  incident: MORTGAGE_DAY.closing + 42,
  /** The claims desk and the repairer's grant. */
  desk: MORTGAGE_DAY.closing + 43,
  /** The job card, the estimate and its approval. */
  estimate: MORTGAGE_DAY.closing + 44,
  /** The repair is finished; the repairer's grant ends; its next read is refused. */
  complete: MORTGAGE_DAY.closing + 49,
  /** Alex closes the claim. */
  close: MORTGAGE_DAY.closing + 50,
});

export const CLAIM_NUMBER = "CLM-1";

/** Paths in Alex's pod. A trailing slash is a container. */
export const PATHS = Object.freeze({
  claim: `claims/${CLAIM_NUMBER}/`,
  incident: `claims/${CLAIM_NUMBER}/incident`,
  otherParty: `claims/${CLAIM_NUMBER}/other-party`,
  photos: `claims/${CLAIM_NUMBER}/photos/`,
  damageReport: `claims/${CLAIM_NUMBER}/damage-report`,
  estimate: `claims/${CLAIM_NUMBER}/estimate`,
  invoice: `claims/${CLAIM_NUMBER}/invoice`,
  licence: "identity/driver-licence",
  policy: "insurance/motor-policy",
});

/** The photos Alex took, as drawings (`photos.ts`), and what each shows. */
export const PHOTOS = Object.freeze([
  { caption: "Rear bumper, cracked at the left corner", file: "rear-bumper.svg" },
  { caption: "Left tail light, lens broken", file: "tail-light.svg" },
] as const);

/** Paths in the organisations' own pods. */
export const ORG_PATHS = Object.freeze({
  /** Wrenfield's claim record. */
  insurerCase: `claims/${CLAIM_NUMBER}`,
  /** Wrenfield's records of the two credentials it checked at source. */
  insurerLicenceCheck: `claims/${CLAIM_NUMBER}-checks/driver-licence`,
  insurerPolicyCheck: `claims/${CLAIM_NUMBER}-checks/motor-policy`,
  /** Wrenfield's record that it issued the motor policy credential. */
  policyIssuance: "issued/motor-policy",
  /** Anvil's job record. */
  repairerJob: `jobs/${CLAIM_NUMBER}`,
});

/** Alex's car. */
export const CAR = Object.freeze({
  color: "Blue",
  name: "Larkspur Tern",
  vin: "DEMOVIN0000000001",
});

/** The motor policy Wrenfield Mutual insures the car under. */
export const MOTOR_POLICY = Object.freeze({
  coverages: ["Collision", "Comprehensive", "Liability"],
  deductibleUsd: 500,
  policyNumber: "WM-AU-771204",
  /** Days of the shared calendar the policy year runs over. */
  startDay: 1,
  termDays: 365,
});

/** What happened, in Alex's words. */
export const INCIDENT = Object.freeze({
  description:
    "Parked and empty. Another car reversed out of the bay opposite into the rear left corner. The other driver stopped and we swapped details.",
  location: "Grafton Street car park, Marlow",
  /** When it happened, on {@link DAY.incident}. */
  time: "08:40",
});

/** The other driver, as Alex took the details down. */
export const OTHER_PARTY = Object.freeze({
  insurerName: "Pellmore Insurance",
  name: "Lee Navarro",
  policyNumber: "PM-AU-30117",
  telephone: "(614) 555-0142",
  vehicle: Object.freeze({ name: "Calder Vane", plate: "DEMO 417" }),
});

/** The damage Wrenfield's handler records from the photos. */
export const DAMAGE = Object.freeze([
  "Rear bumper cover: cracked at the left corner, replace",
  "Left tail light: lens broken, replace",
]);

/** Anvil's estimate, from the damage report (amounts are illustrative). */
export const ESTIMATE = Object.freeze({
  estimateNumber: "ANV-2041",
  invoiceNumber: "ANV-INV-2041",
  lineItems: Object.freeze([
    Object.freeze({ amountUsd: 640, name: "Rear bumper cover, part" }),
    Object.freeze({ amountUsd: 185.5, name: "Left tail light assembly, part" }),
    Object.freeze({ amountUsd: 380, name: "Labour, 4 hours" }),
    Object.freeze({ amountUsd: 210, name: "Paint and materials" }),
  ]),
});
