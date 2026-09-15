import type { StrategyBoardMaterialSet } from "./types.js";
import environmentSvg from "../../assets/ilyon/observatory/ilyon-observatory-environment.svg?raw";
import foregroundSvg from "../../assets/ilyon/observatory/ilyon-observatory-foreground.svg?raw";
import uncrownedStandardSvg from "../../assets/ilyon/crown-tides/uncrowned-standard.svg?raw";
import benefactorStandardSvg from "../../assets/ilyon/crown-tides/benefactor-standard.svg?raw";

const svgDataUrl = (value: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;

export const ILYON_CROWN_TIDES_MATERIAL_SET: StrategyBoardMaterialSet = {
  cartridgeDigest: "cart1_ebf62fdf66717901d70428983d9da598b37d75ce4c63831546fe3ccfb5964ba4",
  producer: "world-forge-v2/project-authored-ilyon-materializer",
  sourceClass: "project-authored",
  environmentUrl: svgDataUrl(environmentSvg),
  foregroundUrl: svgDataUrl(foregroundSvg),
  standards: {
    human: svgDataUrl(uncrownedStandardSvg),
    automatic: svgDataUrl(benefactorStandardSvg),
  },
  spaces: {
    confluence: { kind: "council", atmosphere: "civic", landmark: "Open Council Lens", populationHint: "delegates, ward messengers, tide pilots" },
    "fever-ward": { kind: "ward", atmosphere: "care", landmark: "Cure Relay", populationHint: "patients, clinicians, families" },
    "grain-harbor": { kind: "harbor", atmosphere: "trade", landmark: "Harvest Grid", populationHint: "dock crews, growers, route keepers" },
    "free-observatory": { kind: "observatory", atmosphere: "science", landmark: "Dead-Star Archive Array", populationHint: "astronomers, custodians, public witnesses" },
    "deep-tide": { kind: "embassy", atmosphere: "reef", landmark: "Reef Listener", populationHint: "interpreters, reef envoys, current riders" },
    "integration-spine": { kind: "spine", atmosphere: "integration", landmark: "Interoperability Spine", populationHint: "Benefactor technicians, logistics stewards" },
  },
};
