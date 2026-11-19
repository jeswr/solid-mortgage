// AUTHORED-BY Claude Opus 5.5
/**
 * Recording checks: the declared type must be audio, the bytes must start with a WebM, Ogg or
 * MP4 signature, and the two must agree. Anything else is refused before it is stored.
 */
import type { AudioExt } from "../archive.js";
import { MAX_AUDIO_BYTES } from "./receipts.js";
import { FeedbackError } from "./security.js";

export interface AudioFile {
  bytes: Uint8Array;
  ext: AudioExt;
  type: string;
}

export function sniffAudio(bytes: Uint8Array): AudioExt | undefined {
  if (bytes.length < 12) return undefined;
  const ascii = (from: number, to: number) => new TextDecoder().decode(bytes.slice(from, to));
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "webm";
  }
  if (ascii(0, 4) === "OggS") return "ogg";
  if (
    ascii(4, 8) === "ftyp" &&
    /^(M4A |M4B |isom|iso[2-9]|mp4[12]|MSNV|qt {2})$/.test(ascii(8, 12))
  ) {
    return "m4a";
  }
  return undefined;
}

export function validateAudio(bytes: Uint8Array, contentType: string): AudioFile {
  const mime = (contentType.split(";")[0] ?? "").trim().toLowerCase();
  if (!mime.startsWith("audio/") || bytes.length === 0 || bytes.length > MAX_AUDIO_BYTES) {
    throw new FeedbackError(400, "Each recording must be an audio file of at most 3 MB.");
  }
  const ext = sniffAudio(bytes);
  const expected = ext === "webm" ? "audio/webm" : ext === "ogg" ? "audio/ogg" : "audio/mp4";
  if (ext === undefined || (mime !== expected && !(ext === "m4a" && mime === "audio/x-m4a"))) {
    throw new FeedbackError(400, "Use a WebM, Ogg or MP4 audio recording.");
  }
  return { bytes, ext, type: expected };
}
