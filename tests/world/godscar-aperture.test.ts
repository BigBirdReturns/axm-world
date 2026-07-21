import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KIND_GODS_OF_ILYON } from "../../src/arcs/index.js";
import type { Arc } from "../../src/engine/types.js";
import { GODSCAR_EXTENSION_KEY } from "../../src/godscar/types.js";
import { readGodscarPocketExtension } from "../../src/godscar/compiler.js";
import { GodscarPocketPanel } from "../../src/world/aperture/GodscarPocketPanel.js";
import { inspectGodscarPocket } from "../../src/world/aperture/godscar.js";
import { FIRST_CHARTER } from "../../src/arcs/first-charter.js";

describe("Godscar Pocket Aperture projection", () => {
  it("omits the constitutional panel for ordinary cartridges", () => {
    expect(inspectGodscarPocket(FIRST_CHARTER)).toEqual({ status: "none" });
    expect(renderToStaticMarkup(React.createElement(GodscarPocketPanel, { arc: FIRST_CHARTER }))).toBe("");
  });

  it("renders six pressures, evidence, receipts, and consequences for valid source", () => {
    const inspection = inspectGodscarPocket(KIND_GODS_OF_ILYON);
    expect(inspection.status).toBe("valid");
    const html = renderToStaticMarkup(React.createElement(GodscarPocketPanel, { arc: KIND_GODS_OF_ILYON }));
    expect(html).toContain("godscar-pocket-panel");
    expect(html).toContain("Who possesses the authority to refuse salvation");
    expect((html.match(/data-pressure=/g) ?? [])).toHaveLength(6);
    expect(html).toContain("The cure ledger");
    expect(html).toContain("Final Humanity Benefactors");
    expect(html).toContain("Ilyon&#x27;s systems remain forkable");
  });

  it("bounds large authored ledgers without hiding that more source remains", () => {
    const source = readGodscarPocketExtension(KIND_GODS_OF_ILYON)!;
    const crowded = {
      ...KIND_GODS_OF_ILYON,
      extensions: {
        ...KIND_GODS_OF_ILYON.extensions,
        [GODSCAR_EXTENSION_KEY]: {
          ...source,
          evidence: {
            ...source.evidence,
            receipts: [
              ...source.evidence.receipts,
              ...Array.from({ length: 20 - source.evidence.receipts.length }, (_, index) => ({
                ...source.evidence.receipts[index % source.evidence.receipts.length]!,
                id: `extra-receipt-${index}`,
                label: `Extra Receipt ${index}`,
              })),
            ],
          },
          factionReceipts: [
            ...source.factionReceipts,
            ...Array.from({ length: 20 - source.factionReceipts.length }, (_, index) => ({
              ...source.factionReceipts[index % source.factionReceipts.length]!,
              factionId: `extra-faction-${index}`,
              factionName: `Extra Faction ${index}`,
            })),
          ],
          consequences: [
            ...source.consequences,
            ...Array.from({ length: 24 - source.consequences.length }, (_, index) => ({
              ...source.consequences[index % source.consequences.length]!,
              id: `extra-consequence-${index}`,
              label: `Extra Consequence ${index}`,
            })),
          ],
        },
      },
    } as unknown as Arc;
    const html = renderToStaticMarkup(React.createElement(GodscarPocketPanel, { arc: crowded }));
    expect((html.match(/Intervention:/g) ?? [])).toHaveLength(12);
    expect((html.match(/Prevents:/g) ?? [])).toHaveLength(12);
    expect((html.match(/Inherited by/g) ?? [])).toHaveLength(18);
    expect(html).toContain("8 more remain in the cartridge source");
    expect(html).toContain("6 more remain in the cartridge source");
  });

  it("refuses malformed claimed metadata instead of inventing a projection", () => {
    const malformed = {
      ...KIND_GODS_OF_ILYON,
      extensions: { ...KIND_GODS_OF_ILYON.extensions, [GODSCAR_EXTENSION_KEY]: { format: "godscar-pocket/1" } },
    } as unknown as Arc;
    const inspection = inspectGodscarPocket(malformed);
    expect(inspection.status).toBe("invalid");
    const html = renderToStaticMarkup(React.createElement(GodscarPocketPanel, { arc: malformed }));
    expect(html).toContain("godscar-pocket-invalid");
    expect(html).toContain("Rodoh will not invent canon");
  });
});
