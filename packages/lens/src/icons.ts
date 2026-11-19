// AUTHORED-BY Claude Opus 5.5
/** Small line glyphs, one per entry kind and chip. Decorative: always `aria-hidden`. */
import type { ChipKind } from "@mortgage/demo-kit/contracts";
import type { EntryKind } from "./describe.js";
import { s } from "./dom.js";

const PATHS: Record<string, string> = {
  read: "M12 4v12M7 11l5 5 5-5M5 20h14",
  write: "M12 20V8M7 13l5-5 5 5M5 4h14",
  credential: "M3 6h18v12H3zM3 7l9 6 9-6",
  delete: "M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13",
  grant: "M14 10a4 4 0 1 0-1.2 2.8L20 20M17 17l2-2M15 15l2-2",
  revoke: "M14 10a4 4 0 1 0-1.2 2.8L20 20M4 4l16 16",
  expire: "M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9",
  denied: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6 12h12",
  verified: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6zM8.5 12l2.5 2.5 4.5-5",
  proof: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l3 3 5-6",
  "org-to-org": "M4 17c3-9 13-9 16 0M4 17h.01M20 17h.01",
  "no-solid": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  notified: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
  "grant-used": "M14 10a4 4 0 1 0-1.2 2.8L20 20M4 20l4-4",
  other: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  cabinet: "M5 3h14v18H5zM5 9h14M5 15h14M10 6h4M10 12h4M10 18h4",
  collapse: "M9 6l6 6-6 6",
  expand: "M15 6l-6 6 6 6",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  popout: "M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  table: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14",
};

const CHIP_ICON: Record<ChipKind, string> = {
  "pod read": "read",
  "pod write": "write",
  grant: "grant",
  credential: "credential",
  proof: "proof",
  denied: "denied",
  "no Solid in this step": "no-solid",
};

export function icon(name: EntryKind | keyof typeof PATHS, size = 16): SVGSVGElement {
  return s(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    s("path", { d: PATHS[name] ?? PATHS.other }),
  );
}

export function chipIcon(kind: ChipKind, size = 14): SVGSVGElement {
  return icon(CHIP_ICON[kind] ?? "other", size);
}
