import type { ReactNode } from "react";
import {
  BURN_PROTOCOL_AUTHORED_DIGEST,
  BURN_PROTOCOL_CARTRIDGE_ID,
  EXTERNAL_ASSET_JSON_MAX_BYTES,
  jsonFormat,
  prepareExternalAssetCustody,
} from "../external-assets.js";
import {
  clearExternalCorpusCatalog,
  installExternalCorpusCatalog,
} from "./corpus-atlas.js";

const FORMAT_OVERLAY = "burn-protocol-handoff-publication-overlay/1";
const FORMAT_RECEIPT = "burn-protocol-handoff-publication-activation-receipt/1";
const FORMAT_INDEX = "burn-protocol-corpus-asset-index/1";
const FORMATS = new Set([FORMAT_OVERLAY, FORMAT_RECEIPT, FORMAT_INDEX]);

async function captureCatalog(files: readonly File[]): Promise<void> {
  clearExternalCorpusCatalog(BURN_PROTOCOL_AUTHORED_DIGEST);
  if (files.length === 0) return;
  try {
    const records = new Map<string, string>();
    for (const file of files) {
      if (file.size > EXTERNAL_ASSET_JSON_MAX_BYTES) {
        throw new Error(`${file.name} exceeds the bounded external-custody record ceiling.`);
      }
      const text = await file.text();
      const format = jsonFormat(text);
      if (!format || !FORMATS.has(format)) {
        throw new Error(`${file.name} is not a Burn external-custody record.`);
      }
      if (records.has(format)) throw new Error(`External custody duplicates ${format}.`);
      records.set(format, text);
    }
    const overlayText = records.get(FORMAT_OVERLAY);
    const receiptText = records.get(FORMAT_RECEIPT);
    const indexText = records.get(FORMAT_INDEX);
    if (!overlayText || !receiptText || !indexText) {
      throw new Error("External custody is incomplete.");
    }
    const custody = await prepareExternalAssetCustody({
      overlayText,
      receiptText,
      indexText,
      cartridgeId: BURN_PROTOCOL_CARTRIDGE_ID,
      authoredArcDigest: BURN_PROTOCOL_AUTHORED_DIGEST,
    });
    installExternalCorpusCatalog(custody);
  } catch {
    clearExternalCorpusCatalog(BURN_PROTOCOL_AUTHORED_DIGEST);
  }
}

/** The qualified receiver already owns file admission and error presentation.
 * This wrapper observes only its exact custody input and retains the admitted
 * manifest metadata in process memory so the continuing World can project an
 * atlas. It never sees or stores holder-selected image bytes. */
export function ExternalCorpusCatalogCapture({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div
      data-testid="external-corpus-catalog-capture"
      onChangeCapture={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)
            || target.dataset.testid !== "external-custody-input") return;
        const files = [...(target.files ?? [])];
        void captureCatalog(files);
      }}
    >
      {children}
    </div>
  );
}
