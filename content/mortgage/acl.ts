// AUTHORED-BY Claude Fable 5.2
/**
 * WAC documents built with the `@solid/object` wrappers and written with `n3.Writer`.
 *
 * Three facts about the pod server shape every document here (docs/rebuild/wasm-findings.md):
 * the owner has no implicit rights, so every document names the owner; the nearest ACL document
 * replaces the ones above it; and `acl:default` covers a container's members while
 * `acl:accessTo` covers the container itself.
 */

import type { DatasetCore, Quad } from "@rdfjs/types";
import { Authorization } from "@solid/object";
import { DataFactory, Store, Writer } from "n3";

export const ACL = "http://www.w3.org/ns/auth/acl#";

export type AclMode = "Read" | "Write" | "Append" | "Control";

export interface AclRule {
  /** A WebID, or one of the two agent classes. */
  readonly agent: string | { readonly class: "anyone" | "signed-in" };
  readonly modes: readonly AclMode[];
  /** True when the rule also covers the members of a container target (`acl:default`). */
  readonly inheritable: boolean;
  /**
   * True when the rule covers only the members of a container target (`acl:default` with no
   * `acl:accessTo`). Such rules are written by others (the wallet never makes one) and are kept
   * as they were when the wallet rewrites the document.
   */
  readonly membersOnly?: boolean;
  /** `acl:origin`: the rule applies only to requests from these origins. Never dropped. */
  readonly origins?: readonly string[];
}

const isContainer = (target: string) => target.endsWith("/");

function addAuthorization(dataset: DatasetCore, name: string, target: string, rule: AclRule): void {
  const authorization = new Authorization(`${target}.acl#${name}`, dataset, DataFactory);
  authorization.type.add(`${ACL}Authorization`);
  if (typeof rule.agent === "string") authorization.agent.add(rule.agent);
  else if (rule.agent.class === "anyone") authorization.accessibleToAny = true;
  else authorization.accessibleToAuthenticated = true;
  const membersOnly = isContainer(target) && rule.membersOnly === true;
  if (!membersOnly) authorization.accessTo = target;
  if (isContainer(target) && (rule.inheritable || membersOnly)) authorization.default = target;
  for (const mode of rule.modes) authorization.mode.add(`${ACL}${mode}`);
  for (const origin of rule.origins ?? []) authorization.origin.add(origin);
}

/** The ACL document for `target`: the owner's full control, then `rules` in order. */
export function aclDataset(owner: string, target: string, rules: readonly AclRule[]): DatasetCore {
  const dataset = new Store();
  addAuthorization(dataset, "owner", target, {
    agent: owner,
    inheritable: true,
    modes: ["Read", "Write", "Control"],
  });
  rules.forEach((rule, index) => {
    addAuthorization(dataset, `rule-${index + 1}`, target, rule);
  });
  return dataset;
}

export function aclTurtle(dataset: DatasetCore): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ format: "text/turtle", prefixes: { acl: ACL } });
    writer.addQuads([...dataset] as Quad[]);
    writer.end((error, result) => (error ? reject(error) : resolve(result)));
  });
}

/** Anyone may read `target` and, for a container, what is in it. */
export const PUBLIC_READ: AclRule = {
  agent: { class: "anyone" },
  inheritable: true,
  modes: ["Read"],
};

/** Any signed-in agent may add to the container. Nobody but the owner may read it. */
export const SIGNED_IN_APPEND: AclRule = {
  agent: { class: "signed-in" },
  inheritable: false,
  modes: ["Append"],
};
