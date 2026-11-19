// AUTHORED-BY Claude Opus 5.5
/**
 * What each step of the medication handover does to the pods (flows.md section 5). Every function
 * is a plain function over a `World`, acting as the organisation or person named, so the apps and
 * the headless test run the same code against the same pod server. Copy and step order live in
 * `tour.ts`; the start state in `prepare.ts`.
 *
 * Read order matters to the tour: a step completes on one exact request, so each action ends with
 * the request its tour step names.
 */

import type { OrgSlug, PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { membersOf } from "../mortgage/grants.js";
import {
  at,
  PodRequestError,
  podUrl,
  putResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { ORGS } from "../orgs.js";
import {
  ALLERGY,
  CARER,
  CLINICIANS,
  DAY,
  DISCHARGE_CHANGES,
  HOLDER,
  type Medicine,
  type MedicineChange,
  type MedicineKey,
  NOT_CLINICAL,
  PRACTICE_CHANGE,
  SUPPLY_QUANTITY,
} from "./facts.js";
import {
  AllergyIntolerance,
  buildDischargeSummary,
  buildEncounterRecord,
  buildMedicationDispense,
  buildMedicationRequest,
  buildMedicationStatement,
  buildProvenanceRecord,
  DischargeSummary,
  MedicationDispense,
  MedicationStatement,
  type MedicineCode,
  ProvenanceRecord,
  type ReferenceValue,
} from "./fhir.js";
import {
  approveMedGrants,
  isGrantNotice,
  type MedApproval,
  PATHS,
  readGrantNotice,
  rosaUrl,
  withdrawMedGrant,
} from "./grants.js";

// --- Where things live ---------------------------------------------------------------------------

export const statementUrl = (world: Pick<World, "podOrigin">, key: MedicineKey) =>
  rosaUrl(world, `${PATHS.medications}${key}`);
export const requestUrl = (world: Pick<World, "podOrigin">, key: MedicineKey) =>
  rosaUrl(world, `${PATHS.requests}${key}`);
export const provenanceUrl = (world: Pick<World, "podOrigin">, key: MedicineKey, day: number) =>
  rosaUrl(world, `${PATHS.provenance}${key}-day-${day}`);
export const dispenseUrl = (world: Pick<World, "podOrigin">, key: MedicineKey, day: number) =>
  rosaUrl(world, `${PATHS.dispenses}${key}-day-${day}`);
export const allergyUrl = (world: Pick<World, "podOrigin">) =>
  rosaUrl(world, `${PATHS.allergies}${ALLERGY.key}`);
export const summaryUrl = (world: Pick<World, "podOrigin">) => rosaUrl(world, PATHS.summary);

/** The pharmacy's own dispensing records, in its own pod. */
export const PHARMACY_RECORDS = "dispensing/";
export const pharmacyRecordUrl = (world: Pick<World, "podOrigin">, key: MedicineKey, day: number) =>
  podUrl(world, "pharmacy", `${PHARMACY_RECORDS}rosa-${key}-day-${day}`);

/** The practice's own record of the consultation, in its own pod. */
export const CONSULTATIONS = "consultations/";
export const encounterUrl = (world: Pick<World, "podOrigin">) =>
  podUrl(world, "clinic", `${CONSULTATIONS}rosa-day-${DAY.consultation}`);

export function rosaRef(world: Pick<World, "podOrigin">): ReferenceValue {
  return { display: "Rosa Rivera", iri: webid(world, HOLDER) };
}

export function orgRef(world: Pick<World, "podOrigin">, slug: OrgSlug): ReferenceValue {
  return { display: ORGS[slug].organisation, iri: webid(world, ORGS[slug].actsAs) };
}

// --- Reading Rosa's record -----------------------------------------------------------------------

const isDocument = (url: string) => !url.endsWith("/");

/** The statements on Rosa's list, read as `reader`, in name order. Throws on a refusal. */
export async function readMedicationList(
  world: World,
  reader: PodOwner,
): Promise<MedicationStatement[]> {
  const fetcher = world.fetchAs(reader);
  const statements: MedicationStatement[] = [];
  for (const url of (await membersOf(fetcher, rosaUrl(world, PATHS.medications))).filter(
    isDocument,
  )) {
    statements.push(new MedicationStatement(url, await readDataset(fetcher, url), DataFactory));
  }
  return statements;
}

/** Every provenance record on the list, oldest first. */
export async function readProvenance(world: World, reader: PodOwner): Promise<ProvenanceRecord[]> {
  const fetcher = world.fetchAs(reader);
  const container = rosaUrl(world, PATHS.provenance);
  if ((await statusOf(fetcher, container)) === 404) return [];
  const records: ProvenanceRecord[] = [];
  for (const url of (await membersOf(fetcher, container)).filter(isDocument)) {
    records.push(new ProvenanceRecord(url, await readDataset(fetcher, url), DataFactory));
  }
  return records.sort((a, b) => a.recorded.getTime() - b.recorded.getTime());
}

export async function readAllergies(world: World, reader: PodOwner): Promise<AllergyIntolerance[]> {
  const fetcher = world.fetchAs(reader);
  const allergies: AllergyIntolerance[] = [];
  for (const url of (await membersOf(fetcher, rosaUrl(world, PATHS.allergies))).filter(
    isDocument,
  )) {
    allergies.push(new AllergyIntolerance(url, await readDataset(fetcher, url), DataFactory));
  }
  return allergies;
}

export async function readSummary(world: World, reader: PodOwner): Promise<DischargeSummary> {
  const url = summaryUrl(world);
  return new DischargeSummary(url, await readDataset(world.fetchAs(reader), url), DataFactory);
}

/** The provenance records about one statement, oldest first. */
export function historyOf(
  statement: { value: string },
  records: readonly ProvenanceRecord[],
): ProvenanceRecord[] {
  return records.filter((record) =>
    record.targets.some((target) => target.iri === statement.value),
  );
}

export interface HealthView {
  readonly statements: MedicationStatement[];
  readonly allergies: AllergyIntolerance[];
}

/**
 * Step 1: Rosa opens Health in her wallet. Her list, then her allergies: the step completes on
 * the allergy read.
 */
export async function openHealth(world: World): Promise<HealthView> {
  const statements = await readMedicationList(world, HOLDER);
  const allergies = await readAllergies(world, HOLDER);
  return { allergies, statements };
}

// --- Writing a change with its provenance --------------------------------------------------------

interface ChangeContext {
  readonly writer: OrgSlug;
  readonly author: string;
  readonly time: string;
}

/** Write one change to a statement and the provenance record that says who, when and why. */
async function writeChange(
  world: World,
  change: MedicineChange,
  context: ChangeContext,
): Promise<{ statement: string; provenance: string }> {
  const fetcher = world.fetchAs(ORGS[context.writer].actsAs);
  const when = at(world, context.time);
  const medicine = change.medicine;
  const statement = await putResource(
    fetcher,
    buildMedicationStatement({
      adherence: change.kind === "stopped" ? "stopped-as-directed" : "taking-as-directed",
      dateAsserted: when,
      iri: statementUrl(world, medicine.key),
      medicine,
      subject: rosaRef(world),
      ...(change.kind === "stopped" ? { stopReason: change.why } : {}),
    }),
  );
  const provenance = await putResource(
    fetcher,
    buildProvenanceRecord({
      activity: change.kind === "new" ? "CREATE" : "UPDATE",
      author: context.author,
      iri: provenanceUrl(world, medicine.key, world.day),
      onBehalfOf: orgRef(world, context.writer),
      patient: rosaRef(world),
      recorded: when,
      target: { display: medicine.product, iri: statement },
      why: change.why,
    }),
  );
  return { provenance, statement };
}

// --- Step 2: the ward reconciles and signs -------------------------------------------------------

export interface DischargeView {
  readonly statements: MedicationStatement[];
  readonly allergies: AllergyIntolerance[];
  readonly changes: readonly MedicineChange[];
}

/** The ward pharmacist opens Rosa's list under M1. */
export async function openDischarge(world: World): Promise<DischargeView> {
  return {
    allergies: await readAllergies(world, "hospital"),
    changes: DISCHARGE_CHANGES,
    statements: await readMedicationList(world, "hospital"),
  };
}

/** The keys the discharge prescribes (the dose change and the new medicine). */
export const PRESCRIBED: readonly MedicineKey[] = Object.freeze(
  DISCHARGE_CHANGES.filter((change) => change.kind !== "stopped").map(
    (change) => change.medicine.key,
  ),
);

export function prescribedMedicine(key: MedicineKey): Medicine {
  const change = DISCHARGE_CHANGES.find((candidate) => candidate.medicine.key === key);
  if (change === undefined) throw new Error(`${key} was not prescribed at discharge`);
  return change.medicine;
}

/**
 * Sign: three changes with their provenance, the two discharge prescriptions, then the discharge
 * summary (the step's last write).
 */
export async function signDischarge(world: World, time = "11:00"): Promise<string[]> {
  const hospital = world.fetchAs("hospital");
  const written: string[] = [];
  for (const change of DISCHARGE_CHANGES) {
    const { statement, provenance } = await writeChange(world, change, {
      author: CLINICIANS.hospital,
      time,
      writer: "hospital",
    });
    written.push(statement, provenance);
  }
  for (const key of PRESCRIBED) {
    written.push(
      await putResource(
        hospital,
        buildMedicationRequest({
          authoredOn: at(world, time),
          iri: requestUrl(world, key),
          medicine: prescribedMedicine(key),
          requester: orgRef(world, "hospital"),
          subject: rosaRef(world),
        }),
      ),
    );
  }
  written.push(
    await putResource(
      hospital,
      buildDischargeSummary({
        author: CLINICIANS.hospital,
        date: at(world, time),
        iri: summaryUrl(world),
        notes: [
          "Admitted with chest pain; cardiac causes assessed. Kidney function fell during the stay and recovered.",
          NOT_CLINICAL,
        ],
        sections: [
          {
            entries: DISCHARGE_CHANGES.map((change) => ({
              display: `${change.medicine.product}: ${change.kind.replace("-", " ")}`,
              iri: statementUrl(world, change.medicine.key),
            })),
            title: "Medicine changes",
          },
          {
            entries: PRESCRIBED.map((key) => ({
              display: prescribedMedicine(key).product,
              iri: requestUrl(world, key),
            })),
            title: "Discharge prescriptions",
          },
          { entries: [], title: "Follow-up with the family practice within a week" },
        ],
        subject: rosaRef(world),
        title: "Discharge summary",
      }),
    ),
  );
  return written;
}

// --- Step 3: Rosa decides who can see it ---------------------------------------------------------

/** Approve the pharmacy and the practice, and add Alex as carer: M2, M3 and M4. */
export function approveSharing(world: World, time = "14:30"): Promise<MedApproval> {
  return approveMedGrants(world, ["M2", "M3", "M4"], time);
}

// --- Steps 4 and 7: the pharmacy ------------------------------------------------------------------

/** The pharmacy's own records of what it supplied to Rosa, newest first. */
export async function readPharmacyRecords(world: World): Promise<MedicationDispense[]> {
  const pharmacy = world.fetchAs("pharmacy");
  const container = podUrl(world, "pharmacy", PHARMACY_RECORDS);
  if ((await statusOf(pharmacy, container)) === 404) return [];
  const records: MedicationDispense[] = [];
  for (const url of (await membersOf(pharmacy, container)).filter(isDocument)) {
    if (!url.slice(container.length).startsWith("rosa-")) continue;
    records.push(new MedicationDispense(url, await readDataset(pharmacy, url), DataFactory));
  }
  return records.sort((a, b) => b.whenHandedOver.getTime() - a.whenHandedOver.getTime());
}

export type LineStatus = "unchanged" | "changed" | "stopped" | "new";

/** One line of the pharmacist's view: the list now, against the last supply. */
export interface QueueLine {
  readonly key: string;
  readonly status: LineStatus;
  readonly now: MedicineCode;
  readonly dosage: string;
  /** What was last supplied, when it was. */
  readonly lastSupplied?: { product: string; day: Date };
  /** The latest reason on record, and who gave it. */
  readonly why?: { text: string; author: string; organisation: string };
}

const keyOf = (url: string) => url.slice(url.lastIndexOf("/") + 1);

/** Compare the list with the last supply of each medicine (by RxNorm code). */
export function compareWithLastSupply(
  statements: readonly MedicationStatement[],
  supplies: readonly MedicationDispense[],
  provenance: readonly ProvenanceRecord[],
): QueueLine[] {
  return statements.map((statement) => {
    const medicine = statement.medicine;
    const supplied = supplies.find((supply) => supply.medicine.rxcui === medicine.rxcui);
    const latest = historyOf(statement, provenance).at(-1);
    const status: LineStatus = !statement.isActive
      ? "stopped"
      : supplied === undefined
        ? "new"
        : supplied.medicine.product !== medicine.product
          ? "changed"
          : "unchanged";
    return {
      dosage: statement.dosage,
      key: keyOf(statement.value),
      now: medicine,
      status,
      ...(supplied === undefined
        ? {}
        : { lastSupplied: { day: supplied.whenHandedOver, product: supplied.medicine.product } }),
      ...(latest === undefined
        ? {}
        : {
            why: {
              author: latest.author,
              organisation: latest.onBehalfOf.display,
              text: latest.why,
            },
          }),
    };
  });
}

export interface QueueView {
  readonly lines: QueueLine[];
  readonly allergies: AllergyIntolerance[];
  readonly prescriptions: readonly MedicineKey[];
}

/**
 * Step 4: the pharmacist opens Rosa. Under M2 it reads the reasons, the list and the allergies
 * from Rosa's pod, and its own supply records from its own pod.
 */
export async function openQueue(world: World): Promise<QueueView> {
  const provenance = await readProvenance(world, "pharmacy");
  const statements = await readMedicationList(world, "pharmacy");
  const allergies = await readAllergies(world, "pharmacy");
  const supplies = await readPharmacyRecords(world);
  return {
    allergies,
    lines: compareWithLastSupply(statements, supplies, provenance),
    prescriptions: PRESCRIBED,
  };
}

/**
 * Dispense the discharge prescriptions: a record of each supply in Rosa's pod (where her other
 * clinicians will see it), then the pharmacy's own record of each (which it must keep). The
 * step's last write is the pharmacy's own record of the last item.
 */
export async function dispense(world: World, time = "16:00"): Promise<string[]> {
  const pharmacy = world.fetchAs("pharmacy");
  const when = at(world, time);
  const written: string[] = [];
  const build = (key: MedicineKey, iri: string) =>
    buildMedicationDispense({
      iri,
      medicine: prescribedMedicine(key),
      performer: orgRef(world, "pharmacy"),
      prescriptions: [{ display: "Discharge prescription", iri: requestUrl(world, key) }],
      quantity: SUPPLY_QUANTITY,
      subject: rosaRef(world),
      whenHandedOver: when,
    });
  for (const key of PRESCRIBED) {
    written.push(await putResource(pharmacy, build(key, dispenseUrl(world, key, world.day))));
  }
  for (const key of PRESCRIBED) {
    written.push(await putResource(pharmacy, build(key, pharmacyRecordUrl(world, key, world.day))));
  }
  return written;
}

/**
 * Step 7: the pharmacy reads again. Its own records and the reasons first, then the list, so the
 * step completes on the statement the practice changed (the last in name order).
 */
export async function refreshQueue(world: World): Promise<QueueLine[]> {
  const supplies = await readPharmacyRecords(world);
  const provenance = await readProvenance(world, "pharmacy");
  const statements = await readMedicationList(world, "pharmacy");
  return compareWithLastSupply(statements, supplies, provenance);
}

// --- Step 6: the practice -----------------------------------------------------------------------

export interface ConsultationView {
  readonly statements: MedicationStatement[];
  readonly provenance: ProvenanceRecord[];
  readonly allergies: AllergyIntolerance[];
  readonly summary: DischargeSummary;
}

/** Dr Marsh opens Rosa's record under M3: the summary, the reasons, the list, the allergies. */
export async function openConsultation(world: World): Promise<ConsultationView> {
  const summary = await readSummary(world, "clinic");
  const provenance = await readProvenance(world, "clinic");
  const statements = await readMedicationList(world, "clinic");
  const allergies = await readAllergies(world, "clinic");
  return { allergies, provenance, statements, summary };
}

/**
 * Save: stop the duplicate statin in Rosa's record, with its provenance, then the practice's own
 * record of the consultation, which points at Rosa rather than copying her list (the last write).
 */
export async function stopDuplicate(world: World, time = "09:40"): Promise<string[]> {
  const { statement, provenance } = await writeChange(world, PRACTICE_CHANGE, {
    author: CLINICIANS.clinic,
    time,
    writer: "clinic",
  });
  const encounter = await putResource(
    world.fetchAs("clinic"),
    buildEncounterRecord({
      iri: encounterUrl(world),
      serviceProvider: orgRef(world, "clinic"),
      start: at(world, "09:30"),
      subject: rosaRef(world),
    }),
  );
  return [statement, provenance, encounter];
}

// --- Step 8: the carer --------------------------------------------------------------------------

export interface CarerView {
  /** Whose records are shared with Alex, from the notices in his inbox. */
  readonly sharedBy: string[];
  readonly statements: MedicationStatement[];
}

/**
 * Alex's "Shared with me": the grant notices in his own inbox, then Rosa's list under M4. The
 * step completes on the last statement read.
 */
export async function openSharedWithMe(world: World): Promise<CarerView> {
  const alex = world.fetchAs(CARER);
  const sharedBy: string[] = [];
  for (const url of await membersOf(alex, podUrl(world, CARER, PATHS.inbox))) {
    if (!isGrantNotice(url)) continue;
    const notice = await readGrantNotice(world, CARER, url);
    sharedBy.push(notice.assignerIri);
  }
  return { sharedBy: [...new Set(sharedBy)], statements: await readMedicationList(world, CARER) };
}

// --- Step 9: changing pharmacy ------------------------------------------------------------------

/**
 * Rosa withdraws Corner Dispensary's access (M2). Its back office learns from the notice in its
 * inbox and reads again; the pod refuses that read (see `agents.ts`).
 */
export function changePharmacy(
  world: World,
  time = "10:15",
): Promise<{ acls: string[]; notice: string }> {
  return withdrawMedGrant(world, "M2", time);
}

/**
 * What the pharmacy's next read of the live list gets: the pod's status for Rosa's medicines.
 * After the withdrawal it is 403; the pharmacy's own records in its own pod still read.
 */
export async function pharmacyReadsList(world: World): Promise<number> {
  return statusOf(world.fetchAs("pharmacy"), rosaUrl(world, PATHS.medications));
}

export { PodRequestError };
