// AUTHORED-BY Claude Opus 5.5
/** Durations for people and for machines. */

/** 290 → "4 min 50 s"; 180 → "3 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

/** 290 → "PT4M50S", for `<time dateTime>`. */
export function isoDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `PT${minutes > 0 ? `${minutes}M` : ""}${rest > 0 || minutes === 0 ? `${rest}S` : ""}`;
}

/** 75.4 → "1:15". */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
