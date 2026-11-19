// AUTHORED-BY Claude Opus 5.5
import { defineConfig, mergeConfig } from "vitest/config";
import root from "../../vitest.config.js";

/**
 * The workspace config, with a longer per-test timeout. The first SHACL validation in each test
 * file pays comunica's cold start (the sh:sparql constraints), which can pass vitest's 5 s
 * default on a loaded runner. That is start-up cost, not a hang, so a longer timeout keeps every
 * test's meaning.
 */
export default mergeConfig(root, defineConfig({ test: { testTimeout: 30_000 } }));
