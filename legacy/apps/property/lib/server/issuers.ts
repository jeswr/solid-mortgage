/**
 * Per-brand issuer identity for the two property flows: the Cotality-modelled
 * appraisal issuer and the First American-modelled title issuer. An issuer
 * identity is a WebID + an `eddsa-rdfc-2022` signing key + a hosted Bitstring
 * Status List URL (decision 0007: revocation only).
 *
 * KEY POLICY (fail-closed): runtime signing is OFF unless
 * `config.enableRuntimeIssuance` is set (env `MORTGAGE_ENABLE_RUNTIME_ISSUANCE`
 * or the dev/e2e loopback flag). A production deploy therefore never holds an
 * accidental signing key — the issue rail answers 503 until an operator opts in
 * or injects a real org KMS key through the `IssuerRegistry` seam.
 *
 * DEMO-KEY LIMITATION (roborev sm-33 High; follow-up bead): when runtime
 * issuance is enabled without an injected registry, the key is generated
 * IN-MEMORY and is EPHEMERAL per process — `generateKeyPairForSuite` is random,
 * NOT deterministic from the verification-method IRI, so a restart re-keys the
 * same IRI, and the public key is NOT published at that IRI. That is acceptable
 * ONLY for the demo, where credentials are re-issued each session and this
 * app's own tests verify with the in-process public key. A production issuer
 * MUST inject a persistent KMS-backed `IssuerRegistry` whose public key is
 * published at the verification method (rotating the IRI on rotation) — the
 * cross-app verify path (sm-36) depends on that publication.
 *
 * The `credentialSubject` verification against the caller (decision 0015 L3)
 * and the pod-write authorization (WAC, L4) are enforced elsewhere; this module
 * only owns "who signs and with what key".
 */
import { generateKeyPairForSuite, type KeyPair } from "@mortgage/vc-kit";
import type { PropertyConfig } from "./config";
import { PodAccessError } from "./pod";

export type IssuerBrand = "appraisal" | "title";

export interface IssuerIdentity {
  readonly brand: IssuerBrand;
  /** The org WebID that appears as `cred:issuer` (Cotality / First American). */
  readonly webid: string;
  /** The `eddsa-rdfc-2022` (Ed25519) signing key. */
  readonly key: KeyPair;
  /** Hosted Bitstring Status List URL the minted `credentialStatus` points at. */
  readonly statusListUrl: string;
}

/** Resolve the signing identity for a brand, or fail closed. */
export interface IssuerRegistry {
  resolve(brand: IssuerBrand): Promise<IssuerIdentity>;
}

function issuerWebId(config: PropertyConfig, brand: IssuerBrand): string {
  return brand === "appraisal" ? config.appraisalIssuerWebId : config.titleIssuerWebId;
}

function statusListUrl(config: PropertyConfig, brand: IssuerBrand): string {
  return brand === "appraisal" ? config.appraisalStatusListUrl : config.titleStatusListUrl;
}

/**
 * The default env-driven registry: in-memory demo keys, gated fail-closed on
 * `enableRuntimeIssuance`. Keys are cached per brand so repeated issuance in one
 * process reuses one verification method.
 */
export function createIssuerRegistry(config: PropertyConfig): IssuerRegistry {
  const cache = new Map<IssuerBrand, Promise<IssuerIdentity>>();
  return {
    resolve(brand: IssuerBrand): Promise<IssuerIdentity> {
      if (!config.enableRuntimeIssuance) {
        return Promise.reject(
          new PodAccessError(
            503,
            "runtime credential issuance is disabled — set MORTGAGE_ENABLE_RUNTIME_ISSUANCE " +
              "(or the dev loopback flag) and provide the issuer signing key",
          ),
        );
      }
      const cached = cache.get(brand);
      if (cached !== undefined) return cached;
      const webid = issuerWebId(config, brand);
      const built = generateKeyPairForSuite(`${webid.split("#")[0]}#key-1`, "Ed25519").then(
        (key): IssuerIdentity => ({
          brand,
          webid,
          key,
          statusListUrl: statusListUrl(config, brand),
        }),
      );
      cache.set(brand, built);
      return built;
    },
  };
}
