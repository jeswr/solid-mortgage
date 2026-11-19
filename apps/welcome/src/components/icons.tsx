// AUTHORED-BY Claude Opus 5.5
/** Small inline icons. All decorative: the text beside each one carries the meaning. */
import type { ReactNode } from "react";

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className ?? "icon"}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <Icon className="icon icon--inline">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function ExternalIcon() {
  return (
    <Icon className="icon icon--inline">
      <path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5" />
    </Icon>
  );
}

export function HomeIcon() {
  return (
    <Icon>
      <path d="M4 11.5 12 5l8 6.5M6.5 10v9h11v-9M10 19v-5h4v5" />
    </Icon>
  );
}

export function ShieldIcon() {
  return (
    <Icon>
      <path d="M12 4 5 7v5c0 4 3 7 7 8 4-1 7-4 7-8V7z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function MoveIcon() {
  return (
    <Icon>
      <path d="M3 8h11v8H3zM14 11h4l3 3v2h-7" />
      <circle cx="7" cy="17.5" r="1.5" />
      <circle cx="17" cy="17.5" r="1.5" />
    </Icon>
  );
}

export function PillIcon() {
  return (
    <Icon>
      <rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(-35 12 12)" />
      <path d="m9.6 8.6 4.9 6.9" />
    </Icon>
  );
}

export function CheckIcon() {
  return (
    <Icon className="icon icon--inline">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function MaskIcon() {
  return (
    <Icon className="icon icon--inline">
      <path d="M4 8c3-1 13-1 16 0 0 5-3 8-8 8s-8-3-8-8z" />
      <path d="M8.5 11h2M13.5 11h2" />
    </Icon>
  );
}
