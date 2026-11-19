/**
 * Public-URL reconstruction for the DPoP `htu` binding. Mirrors the reviewed
 * `apps/lender-boa/lib/server/url.ts` — app-local because the basePath
 * differs per app.
 *
 * Next strips the app's `basePath` (`/gse`) from a route handler's
 * `request.url`, but the caller mints its DPoP proof against the FULL public
 * URL it POSTed to (basePath included). `@jeswr/solid-api-auth` reconstructs
 * the expected `htu` from the request URL's host + pathname, so the stripped
 * pathname would never match the caller's proof. Re-add the basePath here so
 * the reconstructed `htu` equals the public URL.
 */

/** The app's Next.js basePath (must equal `next.config.ts`'s `basePath`). */
export const BASE_PATH = "/gse";

/** A route handler's request with the basePath re-added to the pathname. */
export function publicRequestUrl(request: Request): string {
  const url = new URL(request.url);
  if (url.pathname !== BASE_PATH && !url.pathname.startsWith(`${BASE_PATH}/`)) {
    url.pathname = `${BASE_PATH}${url.pathname}`;
  }
  return url.href;
}
