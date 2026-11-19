// AUTHORED-BY Claude Opus 5.5
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

/** Serve `/county/permit` from `county/permit/index.html`, as the site's routing does. */
const directoryIndex: Plugin = {
  name: "directory-index",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = new URL(req.url ?? "/", "http://x");
      if (!url.pathname.endsWith("/") && !/\.[a-z0-9]+$/i.test(url.pathname)) {
        if (existsSync(join(root, url.pathname, "index.html")))
          req.url = `${url.pathname}/${url.search}`;
      }
      next();
    });
  },
};

export default defineConfig({
  root,
  appType: "mpa",
  logLevel: "warn",
  plugins: [directoryIndex],
  build: { target: "es2022" },
});
