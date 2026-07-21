/** Most recent historical bundled identities. These are evidence locators only:
 * they are never aliases for current cartridge identity and their save blobs are
 * never moved or rewritten under a new digest. */
export const LEGACY_BUNDLED_DIGESTS: Readonly<Record<string, string>> = {
  "first-charter": "cart1_80564819477a58208e3c05db1c52475a252728f35c8ff11fba59cd04bce73b55",
  karazhan: "cart1_c06b8a8e9955e16c1b8d0eb8b23cac26df650a0bdc2faa0b74663e67b300e1d7",
};
