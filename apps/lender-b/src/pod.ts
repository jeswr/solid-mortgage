// AUTHORED-BY Claude Opus 5.5
/**
 * What Copperfield holds, read from its own pod as Copperfield: the presentations in its inbox
 * (JSON: proofs and issuer-signed anchors) and its own result record. Copperfield has no access
 * to Alex's pod; `tryReadIncome` asks anyway, so the visitor can see the pod refuse.
 */
import { parseRdf } from "@jeswr/fetch-rdf";
import { membersOf } from "@mortgage/content/mortgage/grants";
import { STATEMENT_SOURCES } from "@mortgage/content/mortgage/prequalification";
import {
  PodRequestError,
  podUrl,
  readDataset,
  readText,
  statusOf,
  type World,
} from "@mortgage/content/mortgage/world";
import { DeliveredDocument, ZkOperandAnchor } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { keyPaths, type Statement } from "./view.ts";

export interface ReceivedAnchor {
  readonly issuer: string;
  readonly field: string;
  readonly validFrom: Date;
}

export interface ReceivedStatement {
  readonly statement: Statement;
  readonly proofBytes: number;
  readonly anchor?: ReceivedAnchor | undefined;
}

export interface ReceivedPresentation {
  readonly url: string;
  readonly holder: string;
  readonly statements: readonly ReceivedStatement[];
  /** Every key in the JSON that arrived, e.g. `statements[].proof.proof[]`. */
  readonly keys: readonly string[];
  readonly bytes: number;
}

export interface Received {
  readonly presentations: readonly ReceivedPresentation[];
  readonly result?: { readonly description: string; readonly issued: Date } | undefined;
}

interface PresentationJson {
  type?: unknown;
  holder?: unknown;
  statements?: { statement?: Statement; proof?: { proof?: unknown[] }; anchor?: unknown }[];
}

/**
 * The issuer-signed anchor that came with a proof. It was issued into Alex's pod beside the
 * credential it anchors, so its IRI is known from the statement's field.
 */
async function anchorOf(
  world: World,
  statement: Statement,
  turtle: unknown,
): Promise<ReceivedAnchor | undefined> {
  const source = STATEMENT_SOURCES[statement.field];
  if (typeof turtle !== "string" || source === undefined) return undefined;
  const iri = podUrl(world, "alex", source.anchor);
  const anchor = new ZkOperandAnchor(
    iri,
    await parseRdf(turtle, "text/turtle", { baseIRI: iri }),
    DataFactory,
  );
  try {
    return {
      field: anchor.credentialSubject.fieldIri,
      issuer: anchor.issuer,
      validFrom: anchor.validFrom,
    };
  } catch {
    return undefined;
  }
}

async function readPresentation(
  world: World,
  fetcher: typeof fetch,
  url: string,
): Promise<ReceivedPresentation | undefined> {
  const body = await readText(fetcher, url, "application/json");
  let json: PresentationJson;
  try {
    json = JSON.parse(body) as PresentationJson;
  } catch {
    return undefined;
  }
  if (json.type !== "ThresholdPresentation") return undefined;
  const statements: ReceivedStatement[] = [];
  for (const entry of json.statements ?? []) {
    if (entry.statement === undefined) continue;
    statements.push({
      anchor: await anchorOf(world, entry.statement, entry.anchor),
      proofBytes: Array.isArray(entry.proof?.proof) ? entry.proof.proof.length : 0,
      statement: entry.statement,
    });
  }
  return {
    bytes: new TextEncoder().encode(body).length,
    holder: typeof json.holder === "string" ? json.holder : "",
    keys: keyPaths(json),
    statements,
    url,
  };
}

/** What Copperfield received and what it concluded. */
export async function loadReceived(world: World): Promise<Received> {
  const fetcher = world.fetchAs("lender-b");
  const inbox = podUrl(world, "lender-b", "inbox/");
  const presentations: ReceivedPresentation[] = [];
  for (const url of await membersOf(fetcher, inbox)) {
    const presentation = await readPresentation(world, fetcher, url);
    if (presentation !== undefined) presentations.push(presentation);
  }
  return { presentations, result: await loadResult(world) };
}

/** Copperfield's own record of the outcome, if it has checked a presentation. */
export async function loadResult(world: World): Promise<Received["result"]> {
  const url = podUrl(world, "lender-b", "quotes/prequalification");
  try {
    const result = new DeliveredDocument(
      url,
      await readDataset(world.fetchAs("lender-b"), url),
      DataFactory,
    );
    return { description: result.description, issued: result.issued };
  } catch (error) {
    if (error instanceof PodRequestError && error.status === 404) return undefined;
    throw error;
  }
}

/** Copperfield asks Alex's pod for the income credential. It has no grant; returns the status. */
export async function tryReadIncome(world: World): Promise<{ status: number; url: string }> {
  const url = podUrl(world, "alex", "credentials/employment-income");
  return { status: await statusOf(world.fetchAs("lender-b"), url), url };
}
