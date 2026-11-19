/**
 * Process-wide service singleton for the property route handlers. Constructed
 * ONCE per process: the DPoP verifier owns the jti replay store and JWKS cache,
 * and the issuer registry caches the in-process signing keys — per-request
 * instances would let captured proofs replay and re-mint keys each call.
 */
import { configFromEnv, type PropertyConfig } from "./config";
import { createPropertyRailService, type PropertyRailService } from "./pod-rail";

let railService: PropertyRailService | undefined;

/** The property issuer routes behind the decision-0015 caller boundary. */
export function propertyRailService(): PropertyRailService {
  railService ??= createPropertyRailService({ config: configFromEnv() });
  return railService;
}

export function propertyConfig(): PropertyConfig {
  return configFromEnv();
}
