/**
 * The app's Next.js basePath (must equal `next.config.ts`'s `basePath`).
 * Shared by the server rail's `htu` reconstruction and the client panels'
 * API calls (client fetches must target the FULL public path — the zone is
 * served under this prefix).
 */
export const BASE_PATH = "/verifications";
