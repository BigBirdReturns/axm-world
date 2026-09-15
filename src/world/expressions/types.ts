export type StrategySpaceSceneKind =
  | "site"
  | "council"
  | "ward"
  | "harbor"
  | "observatory"
  | "embassy"
  | "spine";

export interface StrategySpaceMaterial {
  kind: StrategySpaceSceneKind;
  atmosphere: "neutral" | "civic" | "care" | "trade" | "science" | "reef" | "integration";
  landmark: string;
  populationHint: string;
}

export interface StrategyBoardMaterialSet {
  cartridgeDigest: `cart1_${string}`;
  producer: string;
  sourceClass: "project-authored" | "generated" | "licensed";
  environmentUrl: string;
  foregroundUrl: string;
  standards: { human: string; automatic: string };
  spaces: Readonly<Record<string, StrategySpaceMaterial>>;
}
