# RODOH v1 support matrix

RODOH v1 makes a bounded local-first support claim. Standards compliance and a green Chromium run are useful evidence, but neither silently expands the supported environment.

## Primary support

| Surface | Supported environment | Acceptance |
|---|---|---|
| Windows desktop | Windows 11 with current stable Microsoft Edge | Complete local operator journey, full Edge smoke, holder-estate export/restore, and NVDA acceptance receipt |
| Automated desktop | Playwright-managed Chromium on Ubuntu and Windows | Complete five-program, Gate 6, Gate 7, persistence, accessibility, and performance gates |
| Automated mobile layout | Pixel 5-equivalent viewport and touch profile in Playwright Chromium and Edge | Complete responsive and custody gates |
| Offline captured build | Dependency-free loopback HTTP server bound to `127.0.0.1` | Cold boot, service-worker/offline restart, import/export, and exact resume |

The product is served from its declared base path. Opening `index.html` through `file://` is not a supported deployment because module loading, service-worker scope, and browser storage behavior differ from the tested local HTTP product.

## Compatibility smoke

Current Firefox and WebKit are compatibility-smoke targets. Their permanent smoke verifies:

- cartridge bay boot;
- exact changed-run import;
- neutral Orchard presentation;
- authored resource vocabulary;
- map projection and restored progress.

A passing smoke does not claim complete browser parity. Full Firefox or WebKit support requires the same complete campaign, accessibility, custody, persistence-failure, and holder-estate journeys used for primary support.

## Assistive technology

The Windows release machine must produce one `rodoh-nvda-edge-acceptance/1` receipt using its installed NVDA and Edge versions. The manual lane covers:

1. cartridge shelf discovery and program identity;
2. keyboard-only entry;
3. view switcher names and state;
4. contract, party, projection, and actionable fix reading order;
5. decision option and consequence announcement;
6. encounter commit and recorded-result navigation;
7. export and restore controls;
8. holder-estate preflight, merge, exact replace, and failure messages;
9. forced-colors and reduced-motion compatibility;
10. no information conveyed solely by a production diagram, color, animation, or sound.

The receipt records actual software versions and explicit pass/fail answers. It is observational acceptance on the release machine, not a claim that every screen-reader/browser combination behaves identically.

## Performance boundary

`docs/performance/RODOH_PERFORMANCE_BUDGETS.json` is the machine-readable budget. Static-build and browser receipts name file counts, byte totals, largest chunks and vectors, SVG complexity, network references, cold-boot time, resource bytes, and DOM-node counts.

A budget is a regression boundary. It does not substitute for playability, accessibility, or the local operator's judgment.

## Version recording

Every browser, operating-system, Node, npm, Playwright, NVDA, build, and repository version used for acceptance is recorded in the generated receipt. “Current” in this document means the exact installed version named by that receipt, not an unrecorded rolling promise.
