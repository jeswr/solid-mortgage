// AUTHORED-BY Claude Fable 5.2
import { RequiredAs, RequiredFrom, TermAs, type TermWrapper } from "@rdfjs/wrapper";
import { DataFactory, Store } from "n3";
import type { MortgageResourceKind } from "../shacl.js";
import { DCTERMS, ODRL, SCHEMA, XSD } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import {
  addChild,
  children,
  dateTime,
  iri,
  iriSet,
  optIri,
  setDateTime,
  setIri,
  setOptIri,
  setStr,
  str,
} from "./fields.js";
import { MortgageResource } from "./resources.js";
import { TypedNode } from "./support.js";

/**
 * The two ODRL policies of a grant (design.md §b.4, §d.4): the access request an organisation
 * posts to the borrower's inbox (`odrl:Request`), and the agreement the wallet writes to
 * `policies/` when the borrower approves (`odrl:Agreement`). WAC enforces; these describe.
 *
 * Actions are the ODRL names for the WAC modes the wallet writes (read, append, write), the
 * same mapping `@jeswr/solid-odrl` uses.
 */

/** The actions a permission may name, keyed by the WAC mode that enforces each. */
export const ACCESS_ACTION_IRIS = {
  Append: ODRL.append,
  Read: ODRL.read,
  Write: ODRL.write,
} as const;

export type AccessModeName = keyof typeof ACCESS_ACTION_IRIS;

/** Events that end a grant whose end is not a fixed date (`mort:GrantEndScheme`). */
export const GRANT_END_IRIS = [
  MORT.GrantEnd_Closing,
  MORT.GrantEnd_ReportDelivered,
  MORT.GrantEnd_PolicyIssued,
  MORT.GrantEnd_PolicyLapses,
  MORT.GrantEnd_ServicingEnds,
  MORT.GrantEnd_LoanRepaid,
] as const;

/** An ODRL `timeInterval`: an `xsd:duration` of whole years, months or days (e.g. P3M). */
const INTERVAL_PATTERN = /^P(?=\d)(\d+Y)?(\d+M)?(\d+D)?$/;

/** One ODRL constraint (mshape:ConstraintShape). */
class Constraint extends TypedNode {
  get leftOperand(): string {
    return iri(this, ODRL.leftOperand);
  }
  /** The right operand as a term: an IRI (purpose, event) or an `xsd:dateTime` literal. */
  get rightOperand(): TermWrapper {
    return RequiredFrom.subjectPredicate(this, ODRL.rightOperand, TermAs.instance(TypedNode));
  }
}

/** When a permission ends: a fixed instant, or an event from {@link GRANT_END_IRIS}. */
export type GrantEnd = { until: Date } | { event: string };

/** One permission of a request or agreement (mshape:PermissionShape). */
export class Permission extends TypedNode {
  /** The WebID the permission is for. Differs from the policy's assignee for an onward recipient. */
  get assigneeIri(): string {
    return iri(this, ODRL.assignee);
  }
  /** The pod resources and containers covered. */
  get targetIris(): Set<string> {
    return iriSet(this, ODRL.target);
  }
  get actionIris(): Set<string> {
    return iriSet(this, ODRL.action);
  }
  /** The WAC modes the actions map to. */
  get modes(): AccessModeName[] {
    const actions = this.actionIris;
    return (Object.keys(ACCESS_ACTION_IRIS) as AccessModeName[]).filter((mode) =>
      actions.has(ACCESS_ACTION_IRIS[mode]),
    );
  }
  private constraintOn(leftOperand: string): Constraint | undefined {
    return children(this, ODRL.constraint, Constraint).find(
      (constraint) => constraint.leftOperand === leftOperand,
    );
  }
  /** The DPV purpose IRI. */
  get purposeIri(): string | undefined {
    return this.constraintOn(ODRL.purpose)?.rightOperand.value;
  }
  /** When the permission ends, if it says. */
  get end(): GrantEnd | undefined {
    const fixed = this.constraintOn(ODRL.dateTime)?.rightOperand;
    if (fixed !== undefined) return { until: new Date(fixed.value) };
    const event = this.constraintOn(ODRL.event)?.rightOperand;
    return event === undefined ? undefined : { event: event.value };
  }
  /**
   * How many times the permission may be used (`odrl:count`), if it says: 1 for a one-time
   * grant. WAC cannot count; the holder's wallet closes the grant after the use.
   */
  get maxUses(): number | undefined {
    const count = this.constraintOn(ODRL.count)?.rightOperand;
    if (count === undefined) return undefined;
    const value = Number(count.value);
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`odrl:count must be a positive integer: ${count.value}`);
    }
    return value;
  }

  /** The recurring interval between permitted uses (`odrl:timeInterval`), e.g. "P3M". */
  get interval(): string | undefined {
    return this.constraintOn(ODRL.timeInterval)?.rightOperand.value;
  }
}

export interface PermissionInit {
  assignee: string;
  targets: readonly string[];
  modes: readonly AccessModeName[];
  /** A DPV purpose IRI. */
  purpose: string;
  end?: GrantEnd;
  /** How many times the permission may be used (`odrl:count`); 1 for a one-time grant. */
  maxUses?: number;
  /** A recurring use, at most once per this `xsd:duration` (e.g. "P3M", quarterly). */
  interval?: string;
}

/** Fields shared by the request and the agreement. */
export abstract class AccessPolicy extends MortgageResource {
  /** The grant code shown in the Lens, G1 to G8. */
  get grantCode(): string {
    return str(this, SCHEMA.identifier);
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  /** The purpose in plain words, as the consent screen shows it. */
  get description(): string {
    return str(this, DCTERMS.description);
  }
  /** The borrower's WebID. */
  get assignerIri(): string {
    return iri(this, ODRL.assigner);
  }
  /** The requesting organisation's WebID. */
  get assigneeIri(): string {
    return iri(this, ODRL.assignee);
  }
  get permissions(): Permission[] {
    return children(this, ODRL.permission, Permission);
  }
  /** Permissions for anyone other than the assignee: the onward recipients. */
  get onwardPermissions(): Permission[] {
    const assignee = this.assigneeIri;
    return this.permissions.filter((permission) => permission.assigneeIri !== assignee);
  }
  get issued(): Date {
    return dateTime(this, DCTERMS.issued);
  }
}

/** An access request in the borrower's `inbox/` (mshape:AccessRequestShape). */
export class AccessRequest extends AccessPolicy {
  override get resourceKind(): MortgageResourceKind {
    return "access-request";
  }
}

/** The agreement in `policies/` (mshape:OdrlPolicyShape). */
export class AccessAgreement extends AccessPolicy {
  override get resourceKind(): MortgageResourceKind {
    return "odrl-policy";
  }
  /** The request this agreement answers. */
  get sourceIri(): string | undefined {
    return optIri(this, DCTERMS.source);
  }
}

export interface AccessPolicyInit {
  iri: string;
  grantCode: string;
  name: string;
  description: string;
  assigner: string;
  assignee: string;
  permissions: readonly PermissionInit[];
  issued: Date;
}

function addConstraint(
  permission: Permission,
  index: number,
  leftOperand: string,
  operator: string,
  write: (constraint: Constraint) => void,
): void {
  const constraint = addChild(permission, ODRL.constraint, Constraint, String(index));
  setIri(constraint, ODRL.leftOperand, leftOperand);
  setIri(constraint, ODRL.operator, operator);
  write(constraint);
}

function applyPolicy(policy: AccessPolicy, init: AccessPolicyInit, type: string): void {
  if (init.permissions.length === 0) throw new RangeError("a policy needs a permission");
  policy.typeIris.add(type);
  setStr(policy, SCHEMA.identifier, init.grantCode);
  setStr(policy, SCHEMA.name, init.name);
  setStr(policy, DCTERMS.description, init.description);
  setIri(policy, ODRL.assigner, init.assigner);
  setIri(policy, ODRL.assignee, init.assignee);
  init.permissions.forEach((permissionInit, index) => {
    if (permissionInit.targets.length === 0 || permissionInit.modes.length === 0) {
      throw new RangeError("a permission needs a target and a mode");
    }
    const permission = addChild(policy, ODRL.permission, Permission, String(index + 1));
    setIri(permission, ODRL.assignee, permissionInit.assignee);
    for (const target of permissionInit.targets) permission.targetIris.add(target);
    for (const mode of permissionInit.modes) permission.actionIris.add(ACCESS_ACTION_IRIS[mode]);
    addConstraint(permission, 1, ODRL.purpose, ODRL.eq, (constraint) =>
      setIri(constraint, ODRL.rightOperand, permissionInit.purpose),
    );
    const end = permissionInit.end;
    if (end !== undefined && "until" in end) {
      addConstraint(permission, 2, ODRL.dateTime, ODRL.lteq, (constraint) =>
        RequiredAs.object(constraint, ODRL.rightOperand, end.until, (value, factory) =>
          factory.literal(value.toISOString(), factory.namedNode(XSD.dateTime)),
        ),
      );
    } else if (end !== undefined) {
      if (!(GRANT_END_IRIS as readonly string[]).includes(end.event)) {
        throw new RangeError(`a grant end event must come from mort:GrantEndScheme: ${end.event}`);
      }
      addConstraint(permission, 2, ODRL.event, ODRL.lt, (constraint) =>
        setIri(constraint, ODRL.rightOperand, end.event),
      );
    }
    const maxUses = permissionInit.maxUses;
    if (maxUses !== undefined) {
      if (!Number.isSafeInteger(maxUses) || maxUses < 1) {
        throw new RangeError(`maxUses must be a positive integer: ${maxUses}`);
      }
      addConstraint(permission, 3, ODRL.count, ODRL.lteq, (constraint) =>
        RequiredAs.object(constraint, ODRL.rightOperand, maxUses, (value, factory) =>
          factory.literal(String(value), factory.namedNode(XSD.integer)),
        ),
      );
    }
    const interval = permissionInit.interval;
    if (interval !== undefined) {
      if (!INTERVAL_PATTERN.test(interval)) {
        throw new RangeError(
          `an interval is an xsd:duration of years, months or days: ${interval}`,
        );
      }
      addConstraint(permission, 4, ODRL.timeInterval, ODRL.eq, (constraint) =>
        RequiredAs.object(constraint, ODRL.rightOperand, interval, (value, factory) =>
          factory.literal(value, factory.namedNode(XSD.duration)),
        ),
      );
    }
  });
  setDateTime(policy, DCTERMS.issued, init.issued);
}

function root<T>(
  ctor: new (
    term: ReturnType<typeof DataFactory.namedNode>,
    store: Store,
    factory: typeof DataFactory,
  ) => T,
  resourceIri: string,
): T {
  return new ctor(DataFactory.namedNode(resourceIri), new Store(), DataFactory);
}

export function buildAccessRequest(init: AccessPolicyInit): AccessRequest {
  const request = root(AccessRequest, init.iri);
  applyPolicy(request, init, ODRL.Request);
  return request;
}

export interface AccessAgreementInit extends AccessPolicyInit {
  /** The request this agreement answers. */
  source?: string;
}

export function buildAccessAgreement(init: AccessAgreementInit): AccessAgreement {
  const agreement = root(AccessAgreement, init.iri);
  applyPolicy(agreement, init, ODRL.Agreement);
  setOptIri(agreement, DCTERMS.source, init.source);
  return agreement;
}

/** The plain permission list of a parsed policy, e.g. to turn a request into its agreement. */
export function permissionInits(policy: AccessPolicy): PermissionInit[] {
  return policy.permissions.map((permission) => {
    const purpose = permission.purposeIri;
    if (purpose === undefined) throw new TypeError("a permission needs a purpose constraint");
    const end = permission.end;
    const maxUses = permission.maxUses;
    const interval = permission.interval;
    return {
      assignee: permission.assigneeIri,
      modes: permission.modes,
      purpose,
      targets: [...permission.targetIris].sort(),
      ...(end === undefined ? {} : { end }),
      ...(maxUses === undefined ? {} : { maxUses }),
      ...(interval === undefined ? {} : { interval }),
    };
  });
}
