// AUTHORED-BY Claude Opus 5.5
/**
 * Alex's two photos of the damage. The demo has no camera, so each "photo" is a small drawing
 * (SVG) stored in the pod as `image/svg+xml`, exactly as a JPEG would be: a binary-ish resource
 * the pod serves, protects and refuses like any other.
 */
import { PHOTOS } from "./facts.js";

export const PHOTO_TYPE = "image/svg+xml";

const frame = (title: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${title}"><title>${title}</title><rect width="320" height="200" fill="#d9d6cf"/><rect y="150" width="320" height="50" fill="#8d8a84"/>${body}</svg>`;

/** The rear of a blue hatchback, its bumper cracked at the left corner. */
const REAR_BUMPER = frame(
  PHOTOS[0].caption,
  '<rect x="60" y="40" width="200" height="90" rx="18" fill="#2f5d9e"/><rect x="80" y="52" width="160" height="38" rx="6" fill="#bcd3ea"/><rect x="50" y="118" width="220" height="30" rx="8" fill="#26272b"/><path d="M58 122 l18 10 l-10 6 l16 8" stroke="#f2c200" stroke-width="4" fill="none"/><circle cx="95" cy="160" r="18" fill="#1b1b1d"/><circle cx="225" cy="160" r="18" fill="#1b1b1d"/>',
);

/** A close-up of the left tail light, its lens broken. */
const TAIL_LIGHT = frame(
  PHOTOS[1].caption,
  '<rect x="40" y="30" width="240" height="120" rx="14" fill="#2f5d9e"/><rect x="90" y="55" width="140" height="70" rx="10" fill="#9e1b1b"/><path d="M120 60 l25 30 l-15 10 l30 25 M160 58 l-10 40 l35 20" stroke="#f4f1ea" stroke-width="4" fill="none"/>',
);

/** Each photo's file name, caption and drawing. */
export const PHOTO_FILES: readonly { file: string; caption: string; svg: string }[] = Object.freeze(
  [
    { ...PHOTOS[0], svg: REAR_BUMPER },
    { ...PHOTOS[1], svg: TAIL_LIGHT },
  ],
);
