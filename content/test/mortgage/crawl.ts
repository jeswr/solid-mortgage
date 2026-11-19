// AUTHORED-BY Claude Fable 5.2
/** Walk a whole pod as its owner, over the same fetch the journey uses. */

import { type MortgageResourceKind, RESOURCE_TARGET_CLASSES, validate } from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { ContainerDataset } from "@solid/object";
import { DataFactory, Parser, Store } from "n3";
import { podUrl, type World } from "../../mortgage/world.js";

export interface Crawled {
  readonly owner: PodOwner;
  readonly url: string;
  readonly contentType: string;
  readonly body: string;
  /** The access-control document beside it, when the pod holds one. */
  readonly acl?: string;
}

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const KINDS = Object.entries(RESOURCE_TARGET_CLASSES) as [MortgageResourceKind, string][];

async function aclOf(fetcher: typeof fetch, url: string): Promise<string | undefined> {
  const response = await fetcher(`${url}.acl`, { headers: { accept: "text/turtle" } });
  return response.ok ? response.text() : undefined;
}

export async function crawl(world: World, owner: PodOwner): Promise<Crawled[]> {
  const fetcher = world.fetchAs(owner);
  const found: Crawled[] = [];
  const queue = [podUrl(world, owner, "")];
  for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
    const response = await fetcher(url, { headers: { accept: "text/turtle, */*;q=0.5" } });
    if (!response.ok) throw new Error(`${owner} cannot read ${url}: ${response.status}`);
    const body = await response.text();
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0] as string;
    const acl = await aclOf(fetcher, url);
    if (!url.endsWith("/")) {
      found.push({ body, contentType, owner, url, ...(acl === undefined ? {} : { acl }) });
      continue;
    }
    if (acl !== undefined) found.push({ acl, body: "", contentType: "container", owner, url });
    const store = new Store(new Parser({ baseIRI: url, format: "text/turtle" }).parse(body));
    const container = new ContainerDataset(store, DataFactory).container;
    if (container === undefined) throw new Error(`${url} is not a container`);
    for (const member of container.contains) queue.push(member.id);
  }
  return found;
}

/** The resource kinds a Turtle document claims by its `rdf:type` statements. */
export function kindsIn(body: string, baseIRI: string): MortgageResourceKind[] {
  const store = new Store(new Parser({ baseIRI, format: "text/turtle" }).parse(body));
  const types = new Set(
    store.getObjects(null, DataFactory.namedNode(RDF_TYPE), null).map((type) => type.value),
  );
  return KINDS.filter(([, targetClass]) => types.has(targetClass)).map(([kind]) => kind);
}

/** Validate one document against the shape of every kind it claims. Returns the problems. */
export async function problemsIn(resource: Crawled): Promise<string[]> {
  const kinds = kindsIn(resource.body, resource.url);
  if (kinds.length === 0) return [`${resource.url}: no known resource type`];
  const problems: string[] = [];
  for (const kind of kinds) {
    const report = await validate(resource.body, { baseIRI: resource.url, expect: kind });
    for (const violation of report.violations) {
      problems.push(`${resource.url} as ${kind}: ${violation.message} (${violation.path ?? ""})`);
    }
  }
  return problems;
}
