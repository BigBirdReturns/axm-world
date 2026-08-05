import { canonicalStoryDigest } from "../../canonical-story/digest.js";
import {
  CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY,
  readCanonicalStoryTimedMediaExtension,
  type CanonicalStoryTimedMedia,
} from "../../canonical-story/timed-media.js";
import type { CanonicalStorySource } from "../../canonical-story/types.js";
import type { Arc } from "../../engine/types.js";

/**
 * Read the Arc timed-media authority against an independently derived story
 * digest. The extension's own storyDigest is never reused as its expectation.
 */
export function readApertureTimedMediaForStory(
  arc: Arc,
  story: CanonicalStorySource,
): CanonicalStoryTimedMedia | null {
  return readCanonicalStoryTimedMediaExtension(
    arc,
    story,
    canonicalStoryDigest(story),
  );
}

/** A timed-media extension without canonical-story authority must fail closed. */
export function arcCarriesApertureTimedMedia(arc: Arc): boolean {
  return arc.extensions?.[CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY] !== undefined;
}
