// AUTHORED-BY Claude Opus 5.5
import { crc32 as nodeCrc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  audioExt,
  crc32,
  escapeMarkdown,
  feedbackArchive,
  isReceiptFor,
  plainTitle,
  renderMarkdown,
  zipStore,
} from "../src/index.js";
import { SUBMISSION } from "./fixtures.js";

/** Read a stored ZIP's entries back (the format zipStore writes), checking each CRC-32. */
function readZip(bytes: Uint8Array): Record<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const out: Record<string, Uint8Array> = {};
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const offset = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.slice(at + 46, at + 46 + nameLength));
    const localNameLength = view.getUint16(offset + 26, true);
    const data = bytes.slice(offset + 30 + localNameLength, offset + 30 + localNameLength + size);
    expect(nodeCrc32(data)).toBe(crc);
    out[name] = data;
    at += 46 + nameLength;
  }
  return out;
}

describe("zip", () => {
  it("computes CRC-32 like zlib", () => {
    const bytes = new TextEncoder().encode("The quick brown fox");
    expect(crc32(bytes)).toBe(nodeCrc32(bytes));
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("writes entries that read back byte for byte", () => {
    const files = {
      "a.txt": new TextEncoder().encode("hello"),
      "ü/b.bin": new Uint8Array([0, 1, 2, 255]),
    };
    expect(readZip(zipStore(files))).toEqual(files);
  });

  it("archives the record, the readable version and the recordings", () => {
    const zip = readZip(
      feedbackArchive(SUBMISSION, [
        { bytes: new Uint8Array([1, 2, 3]), type: "audio/webm;codecs=opus" },
      ]),
    );
    expect(Object.keys(zip)).toEqual(["submission.json", "feedback.md", "audio-1.webm"]);
    expect(JSON.parse(new TextDecoder().decode(zip["submission.json"]))).toEqual(SUBMISSION);
    expect(new TextDecoder().decode(zip["feedback.md"])).toContain("Shorter videos");
    expect(audioExt("audio/mp4")).toBe("m4a");
    expect(audioExt("audio/ogg")).toBe("ogg");
  });
});

describe("markdown", () => {
  it("neutralises mentions, HTML, links and structure", () => {
    const escaped = escapeMarkdown("@team <img src=x> [link](https://x.test) # head");
    expect(escaped).not.toContain("<img");
    expect(escaped).toContain("@‍team");
    expect(escaped).toContain("\\[link\\]\\(https://x\\.test\\)");
    expect(plainTitle("guided: hi @all\n\u0007there")).toBe("guided: hi @‍all there");
  });

  it("leaves no line that can become a heading, list or setext underline", () => {
    const escaped = escapeMarkdown("Title\n===\nOther\n---\n# Heading\n- item\n+ item\n1. item");
    for (const line of escaped.split("\n")) expect(line).not.toMatch(/^\s*([=#+-]|\d+\.)/);
    expect(escaped).toContain("\\=\\=\\=");
    expect(plainTitle("quick: one\r\n# two\u2028three")).toBe("quick: one # two three");
  });

  it("renders ratings, answers and a bounded transcript", () => {
    const record = {
      ...SUBMISSION,
      mode: "interview" as const,
      transcript: Array.from({ length: 40 }, (_, i) => ({
        role: i % 2 ? ("user" as const) : ("assistant" as const),
        content: "y".repeat(3000),
      })),
    };
    const full = renderMarkdown(record);
    expect(full).toContain(
      "| Overall, how easy or difficult was Buying a home to follow? | 6 of 7 |",
    );
    const bounded = renderMarkdown(record, [], {
      maxLength: 20_000,
      recordUrl: "https://x.test/r",
    });
    expect(bounded.length).toBeLessThanOrEqual(20_000);
    expect(bounded).toContain("[Truncated;");
    expect(bounded.endsWith("Full record: [submission.json](https://x.test/r)")).toBe(true);
  });
});

describe("receipt shape check", () => {
  it("accepts a well-formed receipt for the right size only", () => {
    const receipt = {
      sha: "a".repeat(40),
      size: 3,
      ext: "webm",
      sig: `${"1".repeat(13)}.${"b".repeat(64)}`,
    };
    expect(isReceiptFor(receipt, 3)).toBe(true);
    expect(isReceiptFor(receipt, 4)).toBe(false);
    expect(isReceiptFor({ ...receipt, ext: "mp3" }, 3)).toBe(false);
  });
});
