// Expected content-identity digests of the bundled cartridges — the golden
// manifest for Program 001 (The First Charter) and its siblings.
//
// This file is a COMMITTED EXPECTATION, updated intentionally after exact
// authored-law review. The golden-digest guard recomputes each bundled
// cartridge identity and refuses silent changes.

export const EXPECTED_BUNDLED_DIGESTS: Readonly<Record<string, string>> = {
  "first-charter": "cart1_d8888842c6a7a7ba758a8eea567c71fcc8f998ff8af75208ed44ef4eee74edeb",
  "karazhan": "cart1_776adac1b9372d0331ddd774af8b94c80b46bd6bbc4763334cf01def46111144",
  "kind-gods-of-ilyon": "cart1_17054e128dc6fd517fc47f163d92da58d72f9302a84d9d3b04589083afc10f0e",
  "lamp-district": "cart1_05530ae780a30f2f79fb0ddf030ba0e92321d736f146e8e16ddb325ae948b23e",
  "relief-circuit": "cart1_15a9f3792ff8a68948053a06cefcbf586e9960158ca051a187e1ab341b7a2e65",
};
