/**
 * Process-wide service singletons for the route handlers. Constructed ONCE
 * per process: the DPoP verifier owns the jti replay store and JWKS cache,
 * and the nonce store must be shared across the challenge + verify routes —
 * per-request instances would let captured proofs replay.
 */
import { configFromEnv, type LenderConfig } from "./config";
import { PodAccessError } from "./pod";
import { createPodRailService, type PodRailService } from "./pod-rail";
import { createPrequalService, type PrequalService } from "./prequal";

let prequal: PrequalService | undefined;
let podRail: PodRailService | undefined;

export function prequalService(): PrequalService {
  prequal ??= createPrequalService({ config: configFromEnv() });
  return prequal;
}

/** Scene-3/4 pod routes behind the decision-0015 authenticated-caller boundary. */
export function podRailService(): PodRailService {
  podRail ??= createPodRailService({ config: configFromEnv() });
  return podRail;
}

export function lenderConfig(): LenderConfig {
  return configFromEnv();
}

/** Lower a pod-rail failure to an HTTP response without leaking internals. */
export function podErrorResponse(error: unknown): Response {
  if (error instanceof PodAccessError) {
    return Response.json(
      { simulated: true, error: "pod_access", detail: error.message },
      { status: error.status },
    );
  }
  return Response.json({ simulated: true, error: "internal_error" }, { status: 500 });
}
