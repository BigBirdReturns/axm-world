// Cartridge loader: bring an arc in from outside the bundle.
//
// The library already accepts arc JSON by paste or file upload. This module
// adds the two paths that make an arc a *shareable cartridge* rather than a
// file you have to hand-carry:
//
//   1. A URL. Fetch arc JSON from any http(s) address and validate it.
//   2. A `?arc=<url>` deep link. Hand someone a link; they open it and the
//      spoke fetches, bootstraps, and plays your arc — no bundle change.
//
// Everything here is provenance-agnostic about *content* (the schema decides
// whether an arc is valid) but careful about *transport*: only http(s) URLs,
// a size guard, and network/HTTP errors surfaced as plain strings rather than
// thrown. The pure pieces (`arcUrlParam`, `fetchArcText`) take an injectable
// `fetch` and never touch `localStorage`, so they unit-test in plain node;
// persistence stays in `importArcFromJson`.

import { importArcFromJson, type ArcLibraryEntry } from "./arc-library.js";

export type ArcImportResult =
  | { ok: true; entry: ArcLibraryEntry }
  | { ok: false; errors: string[] };

// A cartridge fetched over the wire shouldn't be able to wedge the tab. Arcs
// are small JSON documents; 5 MB is already far past any real arc.
export const MAX_ARC_BYTES = 5 * 1024 * 1024;

// Pull the `?arc=<url>` cartridge link out of a query string. Pure and
// total — returns null when the param is absent, empty, or the string can't
// be parsed. Takes the raw `location.search` so it's testable without a DOM.
export function arcUrlParam(search: string): string | null {
  try {
    const value = new URLSearchParams(search).get("arc");
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

// Fetch arc JSON text from a URL with transport guard rails. Does not parse,
// validate, or persist — that's `importArcFromJson`'s job. Never throws;
// failures come back as human-readable error strings so the UI can render them
// the same way it renders schema errors.
export async function fetchArcText(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; text: string } | { ok: false; errors: string[] }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, errors: [`Not a valid URL: ${url}`] };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      errors: [`Unsupported URL scheme "${parsed.protocol}". Cartridges must be served over http or https.`],
    };
  }

  let res: Response;
  try {
    res = await fetchImpl(parsed.toString(), { redirect: "follow" });
  } catch (e) {
    return { ok: false, errors: [`Network error fetching arc: ${(e as Error).message}`] };
  }
  if (!res.ok) {
    return { ok: false, errors: [`Fetch failed: HTTP ${res.status} ${res.statusText}`.trimEnd()] };
  }

  let text: string;
  try {
    text = await res.text();
  } catch (e) {
    return { ok: false, errors: [`Could not read response body: ${(e as Error).message}`] };
  }
  if (text.length > MAX_ARC_BYTES) {
    return {
      ok: false,
      errors: [`Arc is too large (${text.length} bytes; max ${MAX_ARC_BYTES}).`],
    };
  }
  return { ok: true, text };
}

// Fetch + validate + persist into the library, in one call. Convenience over
// `fetchArcText` followed by `importArcFromJson`; because the second step
// touches `localStorage`, this is a UI-side helper, not a pure one.
export async function importArcFromUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ArcImportResult> {
  const fetched = await fetchArcText(url, fetchImpl);
  if (!fetched.ok) return fetched;
  return importArcFromJson(fetched.text);
}
