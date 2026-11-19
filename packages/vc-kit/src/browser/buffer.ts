// AUTHORED-BY Claude Fable 5.2
/**
 * The four `Buffer` operations the pinned `@jeswr/solid-vc` build performs,
 * for runtimes that have no `Buffer` global (a browser page or worker):
 * `Buffer.from(bytes)`, `Buffer.from(text, "base64url")`,
 * `buffer.toString("base64url" | "utf8")`, `Buffer.byteLength(text, "utf8")`
 * and `Buffer.concat(chunks)`.
 *
 * Importing this module for its side effect installs the stand-in only when
 * `globalThis.Buffer` is missing, so Node keeps its own. Import it before
 * anything that issues or verifies a credential (see the README).
 */

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BASE64URL_VALUES = (() => {
  const values = new Int16Array(128).fill(-1);
  for (let i = 0; i < BASE64URL.length; i += 1) values[BASE64URL.charCodeAt(i)] = i;
  // Node's base64url decoder also accepts the standard alphabet.
  values["+".charCodeAt(0)] = 62;
  values["/".charCodeAt(0)] = 63;
  return values;
})();

function decodeBase64Url(text: string): Uint8Array {
  const out = new Uint8Array(Math.floor((text.length * 3) / 4));
  let bits = 0;
  let available = 0;
  let length = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const value = code < 128 ? (BASE64URL_VALUES[code] as number) : -1;
    if (value < 0) break; // Node stops at the first character outside the alphabet.
    bits = (bits << 6) | value;
    available += 6;
    if (available >= 8) {
      available -= 8;
      out[length] = (bits >>> available) & 0xff;
      length += 1;
    }
  }
  return out.subarray(0, length);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] as number;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += BASE64URL[a >> 2];
    out += BASE64URL[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += BASE64URL[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += BASE64URL[c & 63];
  }
  return out;
}

/** A `Uint8Array` with Node's `toString(encoding)` for the two encodings solid-vc uses. */
export class BufferShim extends Uint8Array {
  static override from(source: ArrayLike<number> | Iterable<number> | string, encoding?: unknown) {
    if (typeof source === "string") {
      if (encoding === "base64url") return BufferShim.wrap(decodeBase64Url(source));
      if (encoding === undefined || encoding === "utf8" || encoding === "utf-8") {
        return BufferShim.wrap(new TextEncoder().encode(source));
      }
      throw new Error(`BufferShim.from does not support the ${String(encoding)} encoding`);
    }
    return BufferShim.wrap(Uint8Array.from(source as ArrayLike<number>));
  }

  private static wrap(bytes: Uint8Array): BufferShim {
    const buffer = new BufferShim(bytes.length);
    buffer.set(bytes);
    return buffer;
  }

  static byteLength(text: string, encoding: string = "utf8"): number {
    if (encoding !== "utf8" && encoding !== "utf-8") {
      throw new Error(`BufferShim.byteLength does not support the ${encoding} encoding`);
    }
    return new TextEncoder().encode(text).length;
  }

  static concat(chunks: readonly Uint8Array[]): BufferShim {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const out = new BufferShim(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  override toString(encoding: string = "utf8"): string {
    if (encoding === "base64url") return encodeBase64Url(this);
    if (encoding === "utf8" || encoding === "utf-8") return new TextDecoder().decode(this);
    throw new Error(`BufferShim.toString does not support the ${encoding} encoding`);
  }
}

/** Install {@link BufferShim} as `globalThis.Buffer` when the runtime has none. */
export function installBufferShim(): boolean {
  const scope = globalThis as { Buffer?: unknown };
  if (scope.Buffer !== undefined) return false;
  scope.Buffer = BufferShim;
  return true;
}

installBufferShim();
