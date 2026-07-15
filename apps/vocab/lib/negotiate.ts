import Negotiator from "negotiator";

/**
 * Media types the /mort namespace document is available in, in server
 * preference order: Turtle is canonical (and what a headerless client gets),
 * HTML wins for browsers, JSON-LD on request.
 */
export const VOCAB_MEDIA_TYPES = ["text/turtle", "text/html", "application/ld+json"] as const;

export type VocabMediaType = (typeof VOCAB_MEDIA_TYPES)[number];

/**
 * Negotiates the response media type for an Accept header value.
 * Returns undefined when nothing acceptable was requested (-> 406).
 */
export function negotiateVocabMediaType(acceptHeader: string | null): VocabMediaType | undefined {
  const negotiator = new Negotiator({
    headers: acceptHeader === null ? {} : { accept: acceptHeader },
  });
  return negotiator.mediaType([...VOCAB_MEDIA_TYPES]) as VocabMediaType | undefined;
}
