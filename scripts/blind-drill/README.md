# Blind-operator drill harness

A CDP-only Playwright driver for running the independent blind-operator drill
(`docs/qa/axm-opening-cold-run/`) without OS-level "computer use" automation.

## Why this exists

Four prior blind-operator attempts (`docs/qa/axm-opening-cold-run/INDEPENDENT_OPERATOR_ATTEMPT_{1..4}.md`)
all failed on desktop contention or OS-automation infrastructure, not the app:
a physical key press interrupting Windows control, window-handle mismatches,
a hung browser launch, a sandbox reviewer blocking an OS-level click. None of
that is a property of the game.

This harness launches its own isolated, headless Chromium process and drives
it entirely over CDP (Playwright's normal browser API — mouse/keyboard events
sent to the page, not the OS). There is no window to lose focus, no desktop to
contend with, and nothing for a stray keypress to interrupt. Run it in any
disposable/remote environment and it behaves identically every time.

## Usage

Start the driver (one process, keeps the browser alive across requests):

```bash
node scripts/blind-drill/driver-server.mjs 8901 /tmp/blind-drill-shots
```

Then drive it with plain HTTP from the operator (a fresh agent/session with no
access to source, tests, or `docs/qa/`, per the existing drill's access rule):

- `POST /goto {"url": "..."}` — navigate; returns a snapshot + screenshot path.
- `GET /snapshot` — visible text + visible interactive elements only (no DOM
  internals, no test ids) — the "visible controls only" surface.
- `GET /screenshot` — screenshot path (view with an image-capable reader).
- `POST /click {"text": "..."}` — click the first visible element containing
  that text.
- `POST /type {"text": "..."}` — type into the focused element.
- `POST /key {"key": "Enter"}` — press a single key.
- `POST /reload` — full page reload (for resume/persistence checks).
- `POST /clear-storage` — clear localStorage/sessionStorage (fresh-profile runs).
- `POST /shutdown` — close the browser and exit.

Every mutating call returns the resulting snapshot and a new screenshot, so an
operator never needs a second channel to see what happened.
