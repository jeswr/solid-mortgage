/**
 * Process-wide service singleton for the route handlers. Constructed ONCE
 * per process: the DPoP verifier owns the jti replay store and JWKS cache,
 * and the service pod fetch owns its token cache + DPoP key — per-request
 * instances would let captured proofs replay and re-mint tokens per call.
 */
import { type AusRailService, createAusRailService } from "./aus-rail";
import { configFromEnv } from "./config";

let ausRail: AusRailService | undefined;

/** The AUS run route behind the decision-0015 authenticated-caller boundary. */
export function ausRailService(): AusRailService {
  ausRail ??= createAusRailService({ config: configFromEnv() });
  return ausRail;
}
