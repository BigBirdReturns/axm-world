/** Most recent historical bundled identities. These are evidence locators only:
 * they are never aliases for current cartridge identity and their save blobs are
 * never moved or rewritten under a new digest. */
export const LEGACY_BUNDLED_DIGESTS: Readonly<Record<string, string>> = {
  "first-charter": "cart1_82b89b113ad8cfe67b9a5e731bbde20a9e39624e627ad46f5674672f55ba1737",
  karazhan: "cart1_c06b8a8e9955e16c1b8d0eb8b23cac26df650a0bdc2faa0b74663e67b300e1d7",
};
