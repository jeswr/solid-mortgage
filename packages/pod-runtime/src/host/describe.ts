// AUTHORED-BY Claude Opus 5.5
/** What the Lens shows about a resource (`PodEvent.resource`), read from its RDF with the wrappers. */
import type { PodEvent } from "@mortgage/demo-kit/contracts";
import { DataFactory, type Store } from "n3";
import { CRED, CredentialNode, describedSubjects, isRdfMediaType, parseToStore } from "../rdf.js";

export type ResourceInfo = NonNullable<PodEvent["resource"]>;

/** `label`: the last path segment; `drawer`: the first container under the pod root. */
export function labelOf(podPath: string): { label: string; drawer: string } {
  const segments = podPath.split("/").filter((s) => s !== "");
  const decode = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  const last = segments.at(-1);
  const label = last === undefined ? "/" : `${decode(last)}${podPath.endsWith("/") ? "/" : ""}`;
  const drawer = segments.length > 1 || podPath.endsWith("/") ? decode(segments[0] ?? "") : "";
  return { drawer, label };
}

/**
 * Describe a resource from an RDF body: its `rdf:type`s (of the resource and its fragments) and,
 * for a Verifiable Credential, the type, issuer and validity start. Non-RDF or unparsable bodies
 * give a description without types.
 */
export async function describe(
  podPath: string,
  url: string,
  body: Uint8Array | undefined,
  contentType: string | null,
): Promise<ResourceInfo> {
  const base: ResourceInfo = { ...labelOf(podPath), types: [] };
  if (
    body === undefined ||
    body.byteLength === 0 ||
    !isRdfMediaType(contentType) ||
    podPath.endsWith("/")
  ) {
    return base;
  }
  let store: Store;
  try {
    store = await parseToStore(new TextDecoder().decode(body), contentType ?? "text/turtle", url);
  } catch {
    return base;
  }
  const subjects = describedSubjects(store, url);
  const types = [...new Set(subjects.flatMap((s) => [...s.types]))].sort();
  const vc = subjects.find((s) => s.types.has(`${CRED}VerifiableCredential`));
  if (vc === undefined) return { ...base, types };
  const node = new CredentialNode(DataFactory.namedNode(vc.value), store, DataFactory);
  const specific = [...node.types].filter((t) => t !== `${CRED}VerifiableCredential`).sort();
  return {
    ...base,
    credential: {
      issuer: node.issuer ?? "",
      type: specific[0] ?? `${CRED}VerifiableCredential`,
      validFrom: node.validFrom ?? "",
    },
    types,
  };
}
