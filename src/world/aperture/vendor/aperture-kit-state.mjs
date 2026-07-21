import { APERTURE_LEVELS, APERTURE_SCALE_BOUNDS, normalizedPins } from './aperture-kit-core.mjs';

export const APERTURE_KIT_STATE_VERSION = '1';
const MODES = new Set(['map', 'trace', 'surface']);

function params(input = '') {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  return new URLSearchParams(String(input || '').replace(/^\?/, ''));
}

function token(value, maximum = 200) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim().slice(0, maximum);
  return cleaned || null;
}

function number(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
}

export function apertureStateKeys(prefix = 'apx_') {
  return [
    `${prefix}v`, `${prefix}mode`, `${prefix}scale`, `${prefix}level`,
    `${prefix}focus`, `${prefix}query`, `${prefix}budget`, `${prefix}pins`
  ];
}

export function readApertureKitState(input = '', prefix = 'apx_') {
  const source = params(input);
  if (source.get(`${prefix}v`) !== APERTURE_KIT_STATE_VERSION) return null;
  const mode = source.get(`${prefix}mode`);
  if (!mode || !MODES.has(mode)) return null;
  const level = source.get(`${prefix}level`);
  return {
    version: APERTURE_KIT_STATE_VERSION,
    mode,
    scale: number(source.get(`${prefix}scale`), APERTURE_SCALE_BOUNDS.minimum, APERTURE_SCALE_BOUNDS.maximum, 1),
    level: APERTURE_LEVELS.includes(level) ? level : 'corpus',
    focus: token(source.get(`${prefix}focus`)),
    query: token(source.get(`${prefix}query`), 120) ?? '',
    budget: Math.trunc(number(source.get(`${prefix}budget`), 6, 36, 18)),
    pins: normalizedPins(source.get(`${prefix}pins`), 36)
  };
}

export function writeApertureKitState(state, input = '', prefix = 'apx_') {
  const output = params(input);
  for (const key of apertureStateKeys(prefix)) output.delete(key);
  const mode = MODES.has(state?.mode) ? state.mode : 'map';
  const level = APERTURE_LEVELS.includes(state?.level) ? state.level : 'corpus';
  output.set(`${prefix}v`, APERTURE_KIT_STATE_VERSION);
  output.set(`${prefix}mode`, mode);
  output.set(`${prefix}scale`, number(state?.scale, 1, 5.4, 1).toFixed(2).replace(/\.?0+$/, ''));
  output.set(`${prefix}level`, level);
  output.set(`${prefix}focus`, token(state?.focus) ?? '');
  output.set(`${prefix}query`, token(state?.query, 120) ?? '');
  output.set(`${prefix}budget`, String(Math.trunc(number(state?.budget, 6, 36, 18))));
  output.set(`${prefix}pins`, normalizedPins(state?.pins, 36).join(','));
  return output;
}

export function buildApertureKitUrl(state, href, prefix = 'apx_') {
  const url = new URL(String(href));
  url.search = writeApertureKitState(state, url.search, prefix).toString();
  return url.href;
}
