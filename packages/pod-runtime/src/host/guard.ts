// AUTHORED-BY Claude Opus 5.5
/**
 * Request checks that run in the host BEFORE a body reaches the wasm pod.
 *
 * The 0.1.8 wasm overflows its stack on a JSON-LD body nested about 1000 deep (about 16 KB) and the
 * resulting trap poisons every pod in the module (see the README, "Traps"). Any agent with Append
 * on an inbox could send one. The host therefore refuses bodies nested deeper than a small limit,
 * for JSON-LD and for the Turtle family, and keeps its own 2 MiB size check so an oversized body is
 * never copied into wasm memory.
 */
import { extractMediaType } from "@jeswr/fetch-rdf";

export const MAX_BODY_BYTES = 2 * 1024 * 1024;
/** Real documents nest a handful of levels; the wasm traps near 1000. */
export const MAX_NESTING = 64;

const JSON_TYPES = /json/;
const TURTLE_FAMILY = new Set([
  "text/turtle",
  "text/n3",
  "application/n-triples",
  "application/n-quads",
  "application/trig",
  "application/sparql-update",
]);

/** Deepest `{`/`[` nesting of a JSON text, ignoring brackets inside strings. Stops early past `limit`. */
export function jsonDepth(text: string, limit = Number.POSITIVE_INFINITY): number {
  let depth = 0;
  let max = 0;
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (c === 92)
        i += 1; // backslash: skip the escaped character
      else if (c === 34) inString = false;
      continue;
    }
    if (c === 34) inString = true;
    else if (c === 123 || c === 91) {
      depth += 1;
      if (depth > max) max = depth;
      if (max > limit) return max;
    } else if (c === 125 || c === 93) depth -= 1;
  }
  return max;
}

/**
 * Deepest `[`/`(`/`{` nesting of a Turtle, N3, TriG or SPARQL Update text, ignoring brackets inside
 * IRIs, string literals (short and long) and comments.
 */
export function turtleDepth(text: string, limit = Number.POSITIVE_INFINITY): number {
  let depth = 0;
  let max = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "#") {
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end;
    } else if (ch === "<") {
      // An IRI has no spaces; a `<` followed by whitespace or `=` is a SPARQL operator.
      const end = text.indexOf(">", i);
      const candidate = end === -1 ? "" : text.slice(i + 1, end);
      if (end !== -1 && !/[\s<"{}|^`\\]/.test(candidate)) i = end;
    } else if (ch === '"' || ch === "'") {
      const long = text.startsWith(ch.repeat(3), i);
      const close = long ? ch.repeat(3) : ch;
      let j = i + close.length;
      while (j < text.length && !text.startsWith(close, j)) j += text[j] === "\\" ? 2 : 1;
      i = j + close.length - 1;
    } else if (ch === "[" || ch === "(" || ch === "{") {
      depth += 1;
      if (depth > max) max = depth;
      if (max > limit) return max;
    } else if (ch === "]" || ch === ")" || ch === "}") depth -= 1;
  }
  return max;
}

export interface GuardResult {
  status: 400 | 413;
  message: string;
}

/** Check a request body; `undefined` means it may be dispatched. */
export function checkBody(
  body: Uint8Array,
  contentType: string | null,
  limits: { maxBodyBytes?: number; maxNesting?: number } = {},
): GuardResult | undefined {
  const maxBytes = limits.maxBodyBytes ?? MAX_BODY_BYTES;
  const maxNesting = limits.maxNesting ?? MAX_NESTING;
  if (body.byteLength > maxBytes) {
    return { message: `request body exceeds ${maxBytes} bytes`, status: 413 };
  }
  if (body.byteLength === 0) return undefined;
  const type = extractMediaType(contentType);
  const isJson = type !== null && JSON_TYPES.test(type);
  const isTurtle = type !== null && TURTLE_FAMILY.has(type);
  // An unparsable or missing media type gets both checks: never guess that a body is harmless.
  if (type !== null && !isJson && !isTurtle) return undefined;
  const text = new TextDecoder().decode(body);
  const depth = Math.max(
    isTurtle ? 0 : jsonDepth(text, maxNesting),
    isJson ? 0 : turtleDepth(text, maxNesting),
  );
  if (depth > maxNesting) {
    return { message: `request body nests deeper than ${maxNesting} levels`, status: 400 };
  }
  return undefined;
}
