/**
 * The demo GATEWAY: one local ORIGIN PER APP (its own port), as each app would have its
 * own subdomain when deployed.
 *
 * - Each app's pages are served only on that app's origin; opening another app's page
 *   redirects to that app's origin. API calls across apps (the vault presenting proofs
 *   to the lenders, the tour probing health) are proxied wherever they arrive.
 * - `/<zone>/...` goes to that app's server, everything else to the tour shell.
 * - Automatic demo login: app API calls get the demo borrower's REAL DPoP-bound
 *   Solid-OIDC credentials (a fresh single-use proof per request, minted by the local
 *   dev issuer), exactly what a signed-in browser would send. The apps' own auth
 *   boundaries (decision 0015) verify them unchanged. Visitors can switch it off from
 *   the sidebar to see the apps refuse anonymous calls.
 * - Every HTML page gets the demo overlay (guided steps + pod activity sidebar).
 * - `/__demo/*` serves the overlay, its config, and the live activity stream.
 */
import { readFileSync } from "node:fs";
import { createServer, request as httpRequest, type IncomingMessage, type Server } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ActivityEvent, ActivityLog } from "./activity.ts";
import { ASSISTANT_MODEL, assistantAvailable, decide, validateRequest } from "./assistant.ts";
import { GUIDED_STEPS } from "./steps.ts";

const here = dirname(fileURLToPath(import.meta.url));

export interface GatewayZone {
  /** Path prefix, e.g. `/lender-boa` (the app's Next.js basePath). */
  readonly prefix: string;
  /** The app server's own (upstream) port. */
  readonly port: number;
  /** The public port this app is served on (its origin). */
  readonly publicPort: number;
  readonly appName: string;
}

export interface GatewayOptions {
  /** Public port of the tour (the overview). */
  readonly port: number;
  readonly tourPort: number;
  readonly zones: readonly GatewayZone[];
  readonly log: ActivityLog;
  /** Fresh DPoP credentials for one request, as the demo borrower. */
  readonly borrowerHeaders: (method: string, htu: string) => Promise<Record<string, string>>;
  readonly persona: { readonly name: string; readonly webid: string; readonly podBase: string };
  /** Re-seed the pod to its starting state. */
  readonly reset: () => Promise<void>;
}

export interface Gateway {
  readonly servers: readonly Server[];
  /** Public origin per app key (`tour` or a zone prefix). */
  readonly origins: Readonly<Record<string, string>>;
  /** The app with an API request in flight, when exactly one is (pod-log attribution). */
  inflightApp(): string | undefined;
}

const AUTOLOGIN_COOKIE = "demo-autologin";

function asset(name: string): Buffer {
  return readFileSync(resolve(here, "overlay", name));
}

function cookieValue(request: IncomingMessage, name: string): string | undefined {
  const header = request.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function readBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

const OVERLAY_TAGS = '<script src="/__demo/overlay.js" defer></script>';

const ACTIVITY_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pod activity: Solid Mortgage demo</title><meta name="robots" content="noindex">
<style>html,body{margin:0;background:#fff}</style>${OVERLAY_TAGS}</head><body></body></html>`;

function injectOverlay(html: string): string {
  if (html.includes("/__demo/overlay.js")) return html;
  const at = html.indexOf("</head>");
  if (at !== -1) return `${html.slice(0, at)}${OVERLAY_TAGS}${html.slice(at)}`;
  return `${OVERLAY_TAGS}${html}`;
}

export async function startGateway(options: GatewayOptions): Promise<Gateway> {
  const { log } = options;
  const inflight = new Map<string, number>();
  const signedInApps = new Set<string>();
  const sseClients = new Set<import("node:http").ServerResponse>();

  const broadcast = (event: ActivityEvent) => {
    const frame = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of sseClients) client.write(frame);
  };
  log.on("event", broadcast);
  log.on("cleared", () => {
    for (const client of sseClients) client.write("event: cleared\ndata: {}\n\n");
  });

  const zoneFor = (path: string) =>
    options.zones.find((zone) => path === zone.prefix || path.startsWith(`${zone.prefix}/`));

  const originOf = (port: number) => `http://127.0.0.1:${port}`;
  const origins: Record<string, string> = { tour: originOf(options.port) };
  for (const zone of options.zones) origins[zone.prefix] = originOf(zone.publicPort);

  const overlayConfig = () =>
    JSON.stringify({
      persona: options.persona,
      overview: origins.tour,
      apps: [
        { key: "tour", prefix: "", name: "Overview", origin: origins.tour },
        ...options.zones.map((zone) => ({
          key: zone.prefix,
          prefix: zone.prefix,
          name: zone.appName,
          origin: origins[zone.prefix],
        })),
      ],
      steps: GUIDED_STEPS,
    });

  async function handleDemoRoute(
    request: IncomingMessage,
    response: import("node:http").ServerResponse,
    pathname: string,
  ): Promise<void> {
    const send = (status: number, type: string, body: string | Buffer) => {
      response.writeHead(status, { "content-type": type, "cache-control": "no-store" });
      response.end(body);
    };
    switch (pathname) {
      case "/__demo/overlay.js":
        return send(200, "text/javascript; charset=utf-8", asset("overlay.js"));
      case "/__demo/activity":
        return send(200, "text/html; charset=utf-8", ACTIVITY_PAGE);
      case "/__demo/config.json":
        return send(200, "application/json", overlayConfig());
      case "/__demo/activity.json":
        return send(200, "application/json", JSON.stringify(log.all()));
      case "/__demo/events": {
        response.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-store",
          connection: "keep-alive",
        });
        response.write(": connected\n\n");
        sseClients.add(response);
        const ping = setInterval(() => response.write(": ping\n\n"), 15_000);
        request.on("close", () => {
          clearInterval(ping);
          sseClients.delete(response);
        });
        return;
      }
      case "/__demo/assistant": {
        if (request.method === "GET") {
          return send(
            200,
            "application/json",
            JSON.stringify({ available: await assistantAvailable(), model: ASSISTANT_MODEL }),
          );
        }
        if (request.method !== "POST") return send(405, "text/plain", "GET or POST");
        if (request.headers["sec-fetch-site"] === "cross-site") {
          return send(403, "text/plain", "same-site requests only");
        }
        if (!(await assistantAvailable()))
          return send(503, "application/json", '{"available":false}');
        let parsed: unknown;
        try {
          parsed = JSON.parse((await readBody(request)).toString("utf8"));
        } catch {
          return send(400, "text/plain", "body must be JSON");
        }
        const assistantRequest = validateRequest(parsed);
        if (assistantRequest === undefined) return send(400, "text/plain", "malformed request");
        try {
          return send(200, "application/json", JSON.stringify(await decide(assistantRequest)));
        } catch (error) {
          console.error(
            "[demo] assistant call failed:",
            error instanceof Error ? error.message : error,
          );
          return send(502, "application/json", '{"error":"assistant_unavailable"}');
        }
      }
      case "/__demo/reset": {
        if (request.method !== "POST") return send(405, "text/plain", "POST only");
        if (request.headers["sec-fetch-site"] === "cross-site") {
          return send(403, "text/plain", "same-site requests only");
        }
        await options.reset();
        signedInApps.clear();
        return send(200, "application/json", '{"ok":true}');
      }
      default:
        return send(404, "text/plain", "not found");
    }
  }

  const handle =
    (ownKey: string, ownPort: number) =>
    async (request: IncomingMessage, response: import("node:http").ServerResponse) => {
      const host = request.headers.host ?? `127.0.0.1:${ownPort}`;
      const url = new URL(request.url ?? "/", `http://${host}`);
      if (url.pathname.startsWith("/__demo/")) {
        try {
          await handleDemoRoute(request, response, url.pathname);
        } catch (error) {
          response.writeHead(500, { "content-type": "text/plain" });
          response.end(String(error));
        }
        return;
      }

      const zone = zoneFor(url.pathname);
      const port = zone?.port ?? options.tourPort;
      const appName = zone?.appName ?? "Tour";
      const method = request.method ?? "GET";
      const targetKey = zone?.prefix ?? "tour";
      const navigation =
        method === "GET" &&
        (request.headers["sec-fetch-dest"] === "document" ||
          (request.headers["sec-fetch-dest"] === undefined &&
            (request.headers.accept ?? "").includes("text/html")));
      if (targetKey !== ownKey && navigation) {
        // Another app's page: send the browser to that app's own origin.
        response.writeHead(302, { location: `${origins[targetKey]}${url.pathname}${url.search}` });
        response.end();
        return;
      }
      const isApi = zone !== undefined && url.pathname.startsWith(`${zone.prefix}/api/`);
      const isHealth = url.pathname.endsWith("/api/health");
      // Only the demo's own pages get the automatic login: another site open in the same
      // browser must not be able to act as the demo borrower through this gateway.
      const crossSite = request.headers["sec-fetch-site"] === "cross-site";
      const autoLogin = !crossSite && cookieValue(request, AUTOLOGIN_COOKIE) !== "off";

      const headers: Record<string, string | string[] | undefined> = {
        ...request.headers,
        "x-forwarded-host": host,
        "x-forwarded-proto": "http",
      };
      const wantsHtml = method === "GET" && (request.headers.accept ?? "").includes("text/html");
      if (wantsHtml) headers["accept-encoding"] = "identity";

      if (isApi && !isHealth && autoLogin && !headers.authorization) {
        Object.assign(
          headers,
          await options.borrowerHeaders(method, `${url.origin}${url.pathname}`),
        );
        if (!signedInApps.has(appName)) {
          signedInApps.add(appName);
          log.record({
            kind: "auth",
            actor: options.persona.name,
            app: appName,
            summary: `Signed in to ${appName} as ${options.persona.name} (demo account, done for you): a DPoP-bound Solid-OIDC token from the local identity provider`,
          });
        }
      }

      const body = method === "GET" || method === "HEAD" ? undefined : await readBody(request);
      if (isApi) inflight.set(appName, (inflight.get(appName) ?? 0) + 1);
      const done = () => {
        if (!isApi) return;
        const left = (inflight.get(appName) ?? 1) - 1;
        if (left <= 0) inflight.delete(appName);
        else inflight.set(appName, left);
      };

      const upstream = httpRequest(
        { host: "127.0.0.1", port, method, path: `${url.pathname}${url.search}`, headers },
        (appResponse) => {
          const type = String(appResponse.headers["content-type"] ?? "");
          if (wantsHtml && type.includes("text/html")) {
            const chunks: Buffer[] = [];
            appResponse.on("data", (chunk: Buffer) => chunks.push(chunk));
            appResponse.on("end", () => {
              const html = injectOverlay(Buffer.concat(chunks).toString("utf8"));
              const outHeaders = { ...appResponse.headers };
              delete outHeaders["content-length"];
              delete outHeaders["content-encoding"];
              response.writeHead(appResponse.statusCode ?? 502, outHeaders);
              response.end(html);
              done();
            });
            return;
          }
          response.writeHead(appResponse.statusCode ?? 502, appResponse.headers);
          appResponse.pipe(response);
          appResponse.on("end", done);
        },
      );
      upstream.on("error", (error) => {
        done();
        if (!response.headersSent) {
          response.writeHead(502, { "content-type": "text/plain" });
        }
        response.end(`${appName} is not running: ${error.message}`);
      });
      upstream.end(body);
    };

  const listeners: [string, number][] = [
    ["tour", options.port],
    ...options.zones.map((zone): [string, number] => [zone.prefix, zone.publicPort]),
  ];
  const servers = await Promise.all(
    listeners.map(async ([key, port]) => {
      const server = createServer(handle(key, port));
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", resolve);
      });
      return server;
    }),
  );

  return {
    servers,
    origins,
    inflightApp() {
      if (inflight.size !== 1) return undefined;
      return inflight.keys().next().value;
    },
  };
}
