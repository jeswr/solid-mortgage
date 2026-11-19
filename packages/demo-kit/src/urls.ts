// AUTHORED-BY Claude Opus 5.5
/**
 * Cross-app links (design.md §d.4, §d.5). Every link from one app to another goes through
 * `appUrl`, so switching between path mode (`/lender/…`, ships first) and host mode
 * (`lender.<domain>/…`, when a custom domain exists) is one call to `setUrlMode`.
 */
import { type AppSlug, isAppSlug } from "./registry.js";

export type UrlMode =
  | {
      kind: "path";
      /** Absolute origin to prefix (`https://example.test`); omitted, links are root-relative. */
      origin?: string;
    }
  | {
      kind: "host";
      /** Registrable domain; each app is served at `<slug>.<domain>`, the pods at `pods.<domain>`. */
      domain: string;
      protocol?: "https:" | "http:";
    };

export type UrlParams = Record<string, string | number | boolean | null | undefined>;

let current: UrlMode = { kind: "path" };

/** Choose path or host mode for every later `appUrl` call. Call once at app start-up. */
export function setUrlMode(mode: UrlMode): void {
  if (mode.kind === "host" && !/^[a-z0-9.-]+$/i.test(mode.domain)) {
    throw new Error(`host-mode domain is not a hostname: ${mode.domain}`);
  }
  current = mode;
}

export function urlMode(): UrlMode {
  return current;
}

/**
 * The URL of `path` inside app `slug`, with `params` added to its query string.
 *
 * - Path mode: `/lender/apply?x=1` (or `https://origin/lender/apply?x=1` with an origin).
 * - Host mode: `https://lender.<domain>/apply?x=1`.
 *
 * `path` may carry its own query and fragment; `params` are merged into the query (a `null` or
 * `undefined` value is skipped). A leading slash on `path` is optional.
 */
export function appUrl(
  slug: AppSlug,
  path = "",
  params: UrlParams = {},
  mode: UrlMode = current,
): string {
  if (!isAppSlug(slug)) throw new Error(`unknown app slug: ${String(slug)}`);
  const hashAt = path.indexOf("#");
  const hash = hashAt === -1 ? "" : path.slice(hashAt);
  const beforeHash = hashAt === -1 ? path : path.slice(0, hashAt);
  const queryAt = beforeHash.indexOf("?");
  const pathname = (queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt)).replace(/^\/+/, "");
  const query = new URLSearchParams(queryAt === -1 ? "" : beforeHash.slice(queryAt + 1));
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    query.set(key, String(value));
  }
  const encoded = query.toString();
  const search = encoded === "" ? "" : `?${encoded}`;
  if (mode.kind === "host") {
    const protocol = mode.protocol ?? "https:";
    return `${protocol}//${slug}.${mode.domain}/${pathname}${search}${hash}`;
  }
  return `${mode.origin ?? ""}/${slug}/${pathname}${search}${hash}`;
}

/**
 * The origin that serves `/pods/**`: the page's own origin in path mode (returned as `""`, so
 * pod URLs stay root-relative), `https://pods.<domain>` in host mode.
 */
export function podOrigin(mode: UrlMode = current): string {
  if (mode.kind === "host") return `${mode.protocol ?? "https:"}//pods.${mode.domain}`;
  return mode.origin ?? "";
}

/** Which app a site path belongs to in path mode (`/lender/apply` → `lender`), if any. */
export function appSlugOfPath(pathname: string): AppSlug | undefined {
  const first = pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  return isAppSlug(first) ? first : undefined;
}
