/**
 * Public-URL reconstruction for the DPoP `htu` binding (copied unchanged from
 * apps/lender-boa/lib/server/url.ts — the basePath differs).
 *
 * Next strips the app's `basePath` (`/property`) from a route handler's
 * `request.url`, but the borrower's wallet mints its DPoP proof against the
 * FULL public URL it POSTed to (basePath included). `@jeswr/solid-api-auth`
 * reconstructs the expected `htu` from the request URL's host + pathname, so
 * the stripped pathname would never match the wallet's proof. Re-add the
 * basePath here so the reconstructed `htu` equals the public URL.
 */

/** The app's Next.js basePath (must equal `next.config.ts`'s `basePath`). */
export const BASE_PATH = "/property";

/** A route handler's request with the basePath re-added to the pathname. */
export function publicRequestUrl(request: Request): string {
  const url = new URL(request.url);
  if (url.pathname !== BASE_PATH && !url.pathname.startsWith(`${BASE_PATH}/`)) {
    url.pathname = `${BASE_PATH}${url.pathname}`;
  }
  return url.href;
}
