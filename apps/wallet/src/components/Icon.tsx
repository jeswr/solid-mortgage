// AUTHORED-BY Claude Opus 5.5
/** Cairn's icons: 24 px, rounded 1.8 px strokes, drawn here (no icon library). */
export type IconName =
  | "home"
  | "cards"
  | "bell"
  | "key"
  | "tray"
  | "chevron-left"
  | "chevron-right"
  | "cairn"
  | "seal"
  | "shield"
  | "clock"
  | "check"
  | "cross"
  | "list";

const PATHS: Record<IconName, string> = {
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0",
  cairn: "M5 20h14l-2-4H7zM8 15h8l-1.6-3.4H9.6zM10.5 10.5h3L12 7z",
  cards:
    "M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5zM4 10h16M8 15h4",
  check: "M5 12.5l4.5 4.5L19 7.5",
  "chevron-left": "M14.5 6l-6 6 6 6",
  "chevron-right": "M9.5 6l6 6-6 6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2",
  cross: "M7 7l10 10M17 7L7 17",
  home: "M4 11l8-6.5 8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z",
  key: "M14.5 9.5a4.5 4.5 0 1 1-1.3-3.2M13.2 12.8L20 19.5M17 16.5l2-2",
  list: "M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01",
  seal: "M12 3l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-.9 2.6.9 2.6-2.2 1.6-.9 2.6-2.7-.2L12 21l-2.2-1.6-2.7.2-.9-2.6-2.2-1.6.9-2.6-.9-2.6 2.2-1.6.9-2.6 2.7.2zM9 12l2 2 4-4",
  shield: "M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z",
  tray: "M4 13.5l2.5-8h11l2.5 8V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18zM4 13.5h4.5l1 2h5l1-2H20",
};

export function Icon({ name, label }: { name: IconName; label?: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label === undefined ? undefined : "img"}
      aria-hidden={label === undefined ? true : undefined}
      aria-label={label}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
