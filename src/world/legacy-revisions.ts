/** Most recent historical bundled identities. These are evidence locators only:
 * they are never aliases for current cartridge identity and their save blobs are
 * never moved or rewritten under a new digest. */
export const LEGACY_BUNDLED_DIGESTS: Readonly<Record<string, string>> = {
  "first-charter": "cart1_80564819477a58208e3c05db1c52475a252728f35c8ff11fba59cd04bce73b55",
  "karazhan": "cart1_c06b8a8e9955e16c1b8d0eb8b23cac26df650a0bdc2faa0b74663e67b300e1d7",
  "kind-gods-of-ilyon": "cart1_42d0aa17d6c01c6d11b0c2f944699d52b9a38c999b28302af9b972d736b2498a",
  "lamp-district": "cart1_30f8bd5e8102ae5ebedacbfc59ba8d8c1ab2a2a3177dad5f7781aac3a640f931",
  "relief-circuit": "cart1_c5285f11cba0c4a40fb60db4310fd458f53a4a8775566159fb99610465bea5b1",
};
