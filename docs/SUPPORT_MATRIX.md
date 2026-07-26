# RODOH v1 support matrix

RODOH v1 makes a bounded local-first support claim. Standards compliance and a green Chromium run are useful evidence, but neither silently expands the supported environment.

A downstream release train is requalified after every accepted dependency change. A green donor or parent run is useful provenance, but it is not silently treated as evidence for different assembled bytes.

## Primary support

| Surface | Supported environment | Acceptance |
|---|---|---|
| Windows desktop | Windows 11 with the exact Microsoft Edge version named by the release receipt | Complete local operator journey, holder-estate export/restore, and an NVDA plus Edge acceptance receipt on the release machine |
| Automated desktop | Playwright-managed Chromium on Ubuntu and hosted Windows runners | Complete five-program, Gate 6, Gate 7, persistence, accessibility, and performance gates |
| Automated mobile layout | Pixel 5-equivalent viewport and touch profile in Playwright Chromium and Edge | Complete responsive and custody gates |
| Offline captured build | Dependency-free loopback HTTP server bound to `127.0.0.1` | Cold boot, service-worker/offline restart, import/export, and exact resume |

The product is served from its declared base path. Opening `index.html` through `file://` is not a supported deployment because module loading, service-worker scope, and browser storage behavior differ from the tested local HTTP product.

## Hosted Windows Edge smoke

GitHub-hosted Windows Server runs the Microsoft Edge desktop and mobile-layout smoke. This proves the exact browser journey on the runner version recorded by Actions. It does **not** relabel Windows Server as Windows 11 and does not replace the local Windows 11 operator or NVDA receipt.

## Compatibility smoke

Current Firefox and WebKit are compatibility-smoke targets. Their permanent smoke verifies:

- cartridge bay boot;
- exact changed-run import;
- neutral Orchard presentation;
- authored resource vocabulary;
- map projection and restored progress.

A passing smoke does not claim complete browser parity. Full Firefox or WebKit support requires the same complete campaign, accessibility, custody, persistence-failure, and holder-estate journeys used for primary support.

## Assistive technology

The Windows release machine must produce one `rodoh-nvda-edge-acceptance/1` receipt using its installed NVDA and Edge versions. The recorder refuses dirty repositories, requires the exact Arc commit in the estate lock, and requires the World checkout to descend from the accepted World baseline. The manual lane covers:

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

The receipt records actual OS, Edge, NVDA, Node, npm, Playwright, Arc, and World identities together with explicit acceptance answers. It is observational acceptance on the release machine, not a claim that every screen-reader/browser combination behaves identically.

## Performance boundary

`docs/performance/RODOH_PERFORMANCE_BUDGETS.json` is the machine-readable budget. Static-build and browser receipts name file counts, byte totals, largest chunks and vectors, SVG complexity, executable network references, cold-boot time, document plus subresource bytes, and DOM-node counts.

A budget is a regression boundary. It does not substitute for playability, accessibility, or the local operator's judgment.

## Version recording

The coordinated receipt set records the exact environments used for each claim: repository commits and build identity in the estate and provenance receipts; browser projects, transfers, and timings in browser receipts; and OS, Edge, NVDA, Node, npm, and Playwright in the local accessibility receipt. “Current” means the exact version named by the relevant receipt, not an unrecorded rolling promise.
