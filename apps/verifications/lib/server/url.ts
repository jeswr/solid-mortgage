/**
 * Public-URL reconstruction for the DPoP `htu` binding (same recipe as
 * lender-boa/wallet/closing: Next strips the app's basePath from a route
 * handler's `request.url`, but callers mint their DPoP proofs against the FULL
 * public URL — re-add the basePath so the reconstructed `htu` matches).
 */
import { BASE_PATH } from "../paths";

export { BASE_PATH };

/** A route handler's request with the basePath re-added to the pathname. */
export function publicRequestUrl(request: Request): string {
  const url = new URL(request.url);
  if (url.pathname !== BASE_PATH && !url.pathname.startsWith(`${BASE_PATH}/`)) {
    url.pathname = `${BASE_PATH}${url.pathname}`;
  }
  return url.href;
}
