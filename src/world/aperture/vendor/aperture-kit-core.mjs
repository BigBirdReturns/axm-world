// Neutral visual-aperture primitives shared by any truthful projection.
// Domain adapters decide what a level, item, route, or receipt means.

export const APERTURE_KIT_VERSION = '1';
export const APERTURE_LEVELS = Object.freeze(['corpus', 'machine', 'surface', 'evidence']);
export const APERTURE_SCALE_BOUNDS = Object.freeze({ minimum: 1, maximum: 5.4 });

const ENTER_THRESHOLDS = Object.freeze({ machine: 1.55, surface: 2.85, evidence: 4.15 });
const EXIT_THRESHOLDS = Object.freeze({ corpus: 1.35, machine: 2.6, surface: 3.9 });

/** Semantic zoom with hysteresis. The represented object changes only after a
 * threshold is crossed far enough to avoid one-pixel representation flicker. */
export function semanticLevelForScale(scale, previousLevel = null) {
  const value = Math.max(APERTURE_SCALE_BOUNDS.minimum, Math.min(APERTURE_SCALE_BOUNDS.maximum, Number(scale) || 1));
  if (!APERTURE_LEVELS.includes(previousLevel)) {
    if (value < ENTER_THRESHOLDS.machine) return 'corpus';
    if (value < ENTER_THRESHOLDS.surface) return 'machine';
    if (value < ENTER_THRESHOLDS.evidence) return 'surface';
    return 'evidence';
  }
  if (previousLevel === 'corpus') return value >= ENTER_THRESHOLDS.machine ? 'machine' : 'corpus';
  if (previousLevel === 'machine') {
    if (value < EXIT_THRESHOLDS.corpus) return 'corpus';
    if (value >= ENTER_THRESHOLDS.surface) return 'surface';
    return 'machine';
  }
  if (previousLevel === 'surface') {
    if (value < EXIT_THRESHOLDS.machine) return 'machine';
    if (value >= ENTER_THRESHOLDS.evidence) return 'evidence';
    return 'surface';
  }
  return value < EXIT_THRESHOLDS.surface ? 'surface' : 'evidence';
}

/** Deterministic polar placement: stable identifiers remain visually stable
 * when a renderer replays the same ordered projection. */
export function stableRingPosition(index, count, centerX, centerY, radiusX, radiusY = radiusX, phase = -Math.PI / 2) {
  const safeCount = Math.max(1, count);
  const angle = phase + (index / safeCount) * Math.PI * 2;
  return {
    x: centerX + Math.cos(angle) * radiusX,
    y: centerY + Math.sin(angle) * radiusY,
    angle
  };
}

/** Canonical public pin set. Pins are explicit user intent, deduplicated,
 * codepoint-sorted, and bounded before they enter an address or export. */
export function normalizedPins(value, maximum = 36) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(source.map(item => String(item || '').trim()).filter(Boolean))]
    .sort()
    .slice(0, Math.max(0, Number(maximum) || 0));
}

/** Generic bounded-selection primitive. Adapters provide identity, searchable
 * text, eligibility, and ordering; the kit guarantees pins survive the budget. */
export function selectBudgetedItems(items, {
  query = '',
  budget = 18,
  pinnedIds = [],
  idFor = item => item?.id,
  textFor = item => JSON.stringify(item),
  eligible = () => true,
  compare = (left, right) => String(idFor(left)).localeCompare(String(idFor(right)))
} = {}) {
  const all = Array.isArray(items) ? items : [];
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const pins = new Set(normalizedPins(pinnedIds));
  const eligibleItems = all.filter(eligible);
  const matches = eligibleItems.filter(item => {
    const id = String(idFor(item) ?? '');
    return pins.has(id) || !normalizedQuery || String(textFor(item) ?? '').toLowerCase().includes(normalizedQuery);
  });
  matches.sort((left, right) => {
    const leftPinned = pins.has(String(idFor(left) ?? ''));
    const rightPinned = pins.has(String(idFor(right) ?? ''));
    const pinDelta = Number(rightPinned) - Number(leftPinned);
    return pinDelta || compare(left, right);
  });
  const pinned = matches.filter(item => pins.has(String(idFor(item) ?? '')));
  const unpinned = matches.filter(item => !pins.has(String(idFor(item) ?? '')));
  const target = Math.max(0, Number(budget) || 0, pinned.length);
  const visible = [...pinned, ...unpinned.slice(0, Math.max(0, target - pinned.length))];
  return {
    visible,
    totalCount: all.length,
    eligibleCount: eligibleItems.length,
    hiddenByBudget: Math.max(0, matches.length - visible.length),
    filteredOut: Math.max(0, eligibleItems.length - matches.length),
    ineligibleCount: Math.max(0, all.length - eligibleItems.length)
  };
}
