// AUTHORED-BY Claude Opus 5.5
/**
 * The medication handover's fixed facts (flows.md section 5). Rosa Rivera (Alex's mother) is
 * discharged from Riverbend General Hospital with a changed medication list. Everything here is
 * fictional, every clinical detail included, and none of it is clinical guidance.
 *
 * Medicines are coded at RxNorm ingredient level (term type IN; open question 6: RxNorm by
 * default, SNOMED CT only with a licence). The strength and the instruction are in the text, as a
 * FHIR CodeableConcept's `text` and a Dosage's `text` carry them.
 */

/** The tour's demo id (`?tour=medication-handover`, `PodEvent.tour.demo`). */
export const DEMO = "medication-handover";

/** Whose pod the demo centres on: Rosa (registered in `@mortgage/demo-kit/holders`). */
export const HOLDER = "rosa" as const;
/** Rosa's carer, who reads her medicines from his own wallet. */
export const CARER = "alex" as const;

/** Shown on every clinical screen. */
export const NOT_CLINICAL = "Fictional record. Not clinical guidance.";

/**
 * Simulated days on the demo calendar (day 1 is a Monday): the pharmacy's last supply before the
 * admission, the admission, the discharge, the practice's consultation a week later, and the day
 * Rosa changes pharmacy. All are weekdays.
 */
export const DAY = Object.freeze({
  lastSupply: 22,
  admission: 50,
  discharge: 53,
  consultation: 60,
  changePharmacy: 61,
});

/** The FHIR code system URI of RxNorm. */
export const RXNORM = "http://www.nlm.nih.gov/research/umls/rxnorm";

/** A medicine as Rosa's list names it. */
export interface Medicine {
  /** The resource name in `medications/` (and in the pharmacy's records). */
  readonly key: MedicineKey;
  /** RxNorm concept unique identifier (ingredient level). */
  readonly rxcui: string;
  /** The RxNorm ingredient name (the coding's display). */
  readonly ingredient: string;
  /** Product and strength, as the list shows it ("Lisinopril 10 mg tablet"). */
  readonly product: string;
  /** The instruction ("One tablet each morning"). */
  readonly dosage: string;
}

export const MEDICINE_KEYS = [
  "lisinopril",
  "ibuprofen",
  "metformin",
  "simvastatin",
  "atorvastatin",
] as const;
export type MedicineKey = (typeof MEDICINE_KEYS)[number];

/** Rosa's medicines as she listed them at admission (her own record in Cairn). */
export const ADMISSION_LIST: readonly Medicine[] = Object.freeze([
  {
    dosage: "One tablet each morning",
    ingredient: "lisinopril",
    key: "lisinopril",
    product: "Lisinopril 10 mg tablet",
    rxcui: "29046",
  },
  {
    dosage: "One tablet up to three times a day when needed for pain",
    ingredient: "ibuprofen",
    key: "ibuprofen",
    product: "Ibuprofen 400 mg tablet",
    rxcui: "5640",
  },
  {
    dosage: "One tablet twice a day with meals",
    ingredient: "metformin",
    key: "metformin",
    product: "Metformin 500 mg tablet",
    rxcui: "6809",
  },
  {
    dosage: "One tablet at night",
    ingredient: "simvastatin",
    key: "simvastatin",
    product: "Simvastatin 20 mg tablet",
    rxcui: "36567",
  },
]);

export type ChangeKind = "stopped" | "dose-changed" | "new";

/** One change to the list, with the reason the clinician records for it. */
export interface MedicineChange {
  readonly kind: ChangeKind;
  /** The medicine after the change (for a stop, the medicine as it was). */
  readonly medicine: Medicine;
  readonly why: string;
}

/** What the ward pharmacist reconciles at discharge (step 2): one stopped, one raised, one new. */
export const DISCHARGE_CHANGES: readonly MedicineChange[] = Object.freeze([
  {
    kind: "stopped",
    medicine: ADMISSION_LIST[1] as Medicine,
    why: "Kidney function fell during the stay. Avoid anti-inflammatory painkillers; use acetaminophen for pain.",
  },
  {
    kind: "dose-changed",
    medicine: { ...(ADMISSION_LIST[0] as Medicine), product: "Lisinopril 20 mg tablet" },
    why: "Blood pressure stayed above target on the ward.",
  },
  {
    kind: "new",
    medicine: {
      dosage: "One tablet at night",
      ingredient: "atorvastatin",
      key: "atorvastatin",
      product: "Atorvastatin 40 mg tablet",
      rxcui: "83367",
    },
    why: "Started after the cardiac assessment, to lower cholesterol.",
  },
]);

/** What the practice changes a week later (step 6): the duplicate statin. */
export const PRACTICE_CHANGE: MedicineChange = Object.freeze({
  kind: "stopped",
  medicine: ADMISSION_LIST[3] as Medicine,
  why: "Duplicate statin: atorvastatin, started in hospital, replaces simvastatin.",
});

/** The allergy on record. */
export const ALLERGY = Object.freeze({
  ingredient: "amoxicillin",
  key: "amoxicillin",
  note: "Rash after a course in 2019.",
  product: "Amoxicillin",
  rxcui: "723",
});

/** The clinicians who sign each change (all fictional). */
export const CLINICIANS = Object.freeze({
  hospital: "Imani Brooks, ward pharmacist",
  pharmacy: "Grace Liu, pharmacist",
  clinic: "Dr Lena Marsh, family physician",
});

/** How many tablets the pharmacy supplies per item (a 28-day supply). */
export const SUPPLY_QUANTITY = 28;

export function medicineOf(key: MedicineKey): Medicine {
  const listed = ADMISSION_LIST.find((medicine) => medicine.key === key);
  if (listed !== undefined) return listed;
  const added = DISCHARGE_CHANGES.find((change) => change.medicine.key === key);
  if (added !== undefined) return added.medicine;
  throw new Error(`no medicine ${key}`);
}

export function isMedicineKey(value: string): value is MedicineKey {
  return (MEDICINE_KEYS as readonly string[]).includes(value);
}
