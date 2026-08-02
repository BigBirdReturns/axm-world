import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  holderAssetFileFromBrowser,
  verifyBurnExternalAssetSet,
  type CurrentCartridgeIdentity,
  type VerifiedBurnExternalAssetSet,
  type VerifiedExternalAsset,
} from "./external-assets.js";

export interface MountedExternalAsset extends VerifiedExternalAsset {
  objectUrl: string;
}

export interface MountedExternalAssetSet extends Omit<VerifiedBurnExternalAssetSet, "verifiedAssets"> {
  verifiedAssets: MountedExternalAsset[];
}

export type ExternalAssetReceiverState =
  | { status: "idle" }
  | { status: "verifying"; files: number }
  | { status: "error"; errors: string[] }
  | { status: "mounted"; session: MountedExternalAssetSet };

interface ExternalAssetReceiverContextValue {
  current: CurrentCartridgeIdentity;
  state: ExternalAssetReceiverState;
  mountFiles: (files: readonly File[]) => Promise<void>;
  clear: () => void;
}

const ExternalAssetReceiverContext = createContext<ExternalAssetReceiverContextValue | null>(null);

export function ExternalAssetReceiverProvider({
  current,
  children,
}: {
  current: CurrentCartridgeIdentity;
  children: ReactNode;
}): JSX.Element {
  const [state, setState] = useState<ExternalAssetReceiverState>({ status: "idle" });
  const objectUrls = useRef<string[]>([]);
  const generation = useRef(0);

  const releaseUrls = useCallback(() => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    objectUrls.current = [];
  }, []);

  const clear = useCallback(() => {
    generation.current += 1;
    releaseUrls();
    setState({ status: "idle" });
  }, [releaseUrls]);

  const mountFiles = useCallback(async (browserFiles: readonly File[]) => {
    const attempt = generation.current + 1;
    generation.current = attempt;
    releaseUrls();
    setState({ status: "verifying", files: browserFiles.length });
    try {
      const verified = await verifyBurnExternalAssetSet(
        browserFiles.map(holderAssetFileFromBrowser),
        current,
      );
      const urls: string[] = [];
      const assets = verified.verifiedAssets.map((asset): MountedExternalAsset => {
        const objectUrl = URL.createObjectURL(asset.file.blob);
        urls.push(objectUrl);
        return { ...asset, objectUrl };
      });
      if (generation.current !== attempt) {
        for (const url of urls) URL.revokeObjectURL(url);
        return;
      }
      objectUrls.current = urls;
      setState({ status: "mounted", session: { ...verified, verifiedAssets: assets } });
    } catch (error) {
      if (generation.current !== attempt) return;
      releaseUrls();
      setState({
        status: "error",
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }, [current, releaseUrls]);

  useEffect(() => {
    clear();
    return releaseUrls;
  }, [current.authoredArcDigest, clear, releaseUrls]);

  const value = useMemo<ExternalAssetReceiverContextValue>(
    () => ({ current, state, mountFiles, clear }),
    [current, state, mountFiles, clear],
  );

  return (
    <ExternalAssetReceiverContext.Provider value={value}>
      {children}
    </ExternalAssetReceiverContext.Provider>
  );
}

export function useExternalAssetReceiver(): ExternalAssetReceiverContextValue {
  const value = useContext(ExternalAssetReceiverContext);
  if (!value) throw new Error("External asset receiver must be used inside its provider.");
  return value;
}
