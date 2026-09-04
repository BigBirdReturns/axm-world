import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CompiledDemonstration,
  DemonstrationAspect,
  DemonstrationProposal,
  DirectionCompilation,
} from "../../demonstration/contracts.js";
import {
  computeDemonstrationDigest,
  createEditionProposal,
  proposalUrl,
  validateDemonstrationProposal,
} from "../../demonstration/compiler.js";
import { compileNaturalLanguageDirection } from "../../demonstration/direction.js";
import {
  createDemonstrationRunLedger,
  downloadJson,
  type DemonstrationRunLedger,
} from "./run-ledger.js";
import {
  SHOWCASE_EDITIONS,
  SHOWCASE_PROGRAM,
  compileShowcaseProgram,
  resolveShowcaseProgram,
} from "./timeline.js";

interface StoredStudioVersion {
  readonly id: string;
  readonly createdAt: string;
  readonly direction: string;
  readonly proposal: DemonstrationProposal;
  readonly digest: string;
}

const STORAGE_KEY = "axm-demonstration-studio:first-charter:versions:1";
const MAXIMUM_VERSIONS = 20;

function formatDuration(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1_000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${seconds}s`;
}

function newProposalId(kind = "studio"): string {
  return `proposal:${kind}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function loadVersions(): StoredStudioVersion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const versions: StoredStudioVersion[] = [];
    for (const value of parsed.slice(0, MAXIMUM_VERSIONS)) {
      if (value === null || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      if (
        typeof record.id !== "string"
        || typeof record.createdAt !== "string"
        || typeof record.direction !== "string"
        || typeof record.digest !== "string"
      ) continue;
      try {
        const proposal = validateDemonstrationProposal(record.proposal, SHOWCASE_PROGRAM);
        if (!/^[0-9a-f]{64}$/u.test(record.digest)) continue;
        versions.push({
          id: record.id,
          createdAt: record.createdAt,
          direction: record.direction,
          proposal,
          digest: record.digest,
        });
      } catch {
        // Corrupt local versions are ignored rather than becoming demo authority.
      }
    }
    return versions;
  } catch {
    return [];
  }
}

function saveVersions(versions: readonly StoredStudioVersion[]): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(versions.slice(0, MAXIMUM_VERSIONS)),
  );
}

function buildLiveUrl(
  proposal: DemonstrationProposal,
  compiled: CompiledDemonstration,
  preview = false,
): string {
  const base = new URL("showcase.html", globalThis.location.href);
  const firstChapter = compiled.chapters[0]?.id;
  const url = proposalUrl(base, proposal, firstChapter);
  url.searchParams.set("autoplay", preview ? "1" : compiled.autoplay ? "1" : "0");
  url.searchParams.set("loop", preview ? "0" : compiled.loop ? "1" : "0");
  url.searchParams.set("clean", preview ? "0" : compiled.clean ? "1" : "0");
  url.searchParams.set("sound", compiled.sound ? "1" : "0");
  if (preview) url.searchParams.set("preview", "1");
  return url.toString();
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard && globalThis.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Browser clipboard access is unavailable");
}

export function StudioRoute(): JSX.Element {
  const initialResolution = useMemo(
    () => resolveShowcaseProgram(globalThis.location.search),
    [],
  );
  const [proposal, setProposal] = useState<DemonstrationProposal>(
    initialResolution.compiled.proposal,
  );
  const [direction, setDirection] = useState(
    "Make a 60 second executive demo focused on generation, play, and creator custody.",
  );
  const [directionResult, setDirectionResult] = useState<DirectionCompilation | null>(null);
  const [versions, setVersions] = useState<StoredStudioVersion[]>(loadVersions);
  const [digest, setDigest] = useState<string | null>(null);
  const [notice, setNotice] = useState(
    initialResolution.status === "refused"
      ? initialResolution.error ?? "The supplied proposal was refused"
      : "Source program loaded. No telemetry leaves this browser.",
  );
  const [busy, setBusy] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const ledgerRef = useRef<DemonstrationRunLedger | null>(null);

  const compiled = useMemo(
    () => compileShowcaseProgram(proposal),
    [proposal],
  );
  const selectedChapterIds = useMemo(
    () => compiled.chapters.map((chapter) => chapter.id),
    [compiled],
  );
  const liveUrl = useMemo(
    () => buildLiveUrl(proposal, compiled, false),
    [proposal, compiled],
  );
  const previewUrl = useMemo(
    () => buildLiveUrl(proposal, compiled, true),
    [proposal, compiled],
  );

  useEffect(() => {
    saveVersions(versions);
  }, [versions]);

  useEffect(() => {
    const ledger = createDemonstrationRunLedger(compiled);
    ledger.record("studio.opened", undefined, {
      edition: compiled.edition.id,
      chapters: compiled.chapters.length,
    });
    ledgerRef.current = ledger;
    let cancelled = false;
    setDigest(null);
    void computeDemonstrationDigest(compiled)
      .then((value) => {
        if (cancelled) return;
        setDigest(value);
        ledger.bindDigest(value);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice(
          `Digest held: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [compiled]);

  const reviseProposal = useCallback((
    patch: Partial<DemonstrationProposal>,
    event = "proposal.revised" as const,
  ) => {
    setProposal((current) => validateDemonstrationProposal({
      ...current,
      ...patch,
      id: newProposalId(),
    }, SHOWCASE_PROGRAM));
    ledgerRef.current?.record(event, undefined, {
      fields: Object.keys(patch).join(","),
    });
  }, []);

  const applyDirection = useCallback(async () => {
    setBusy(true);
    try {
      const result = compileNaturalLanguageDirection(SHOWCASE_PROGRAM, direction);
      const nextCompiled = compileShowcaseProgram(result.proposal);
      const nextDigest = await computeDemonstrationDigest(nextCompiled);
      const version: StoredStudioVersion = {
        id: `version:${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        direction,
        proposal: result.proposal,
        digest: nextDigest,
      };
      setDirectionResult(result);
      setProposal(result.proposal);
      setVersions((current) => [version, ...current].slice(0, MAXIMUM_VERSIONS));
      setNotice(
        result.warnings.length > 0
          ? result.warnings.join(" · ")
          : `Compiled ${result.matchedControls.join(" · ")}`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [direction]);

  const saveVersion = useCallback(async () => {
    setBusy(true);
    try {
      const currentDigest = digest ?? await computeDemonstrationDigest(compiled);
      const version: StoredStudioVersion = {
        id: `version:${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        direction,
        proposal,
        digest: currentDigest,
      };
      setVersions((current) => [version, ...current].slice(0, MAXIMUM_VERSIONS));
      ledgerRef.current?.record("version.saved", undefined, {
        digest: currentDigest.slice(0, 12),
      });
      setNotice("Version retained in this browser.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [compiled, digest, direction, proposal]);

  const restoreVersion = useCallback((version: StoredStudioVersion) => {
    setProposal(version.proposal);
    setDirection(version.direction);
    setDirectionResult(null);
    setNotice(`Restored ${version.id}.`);
    ledgerRef.current?.record("version.restored", undefined, {
      version: version.id,
    });
  }, []);

  const selectEdition = useCallback((editionId: string) => {
    const next = createEditionProposal(SHOWCASE_PROGRAM, editionId);
    setProposal({
      ...next,
      id: newProposalId("edition"),
    });
    setDirectionResult(null);
    setNotice(`Loaded the ${editionId} source edition.`);
  }, []);

  const toggleChapter = useCallback((chapterId: string) => {
    const included = selectedChapterIds.includes(chapterId);
    if (included && selectedChapterIds.length === 1) {
      setNotice("A demonstration must retain at least one source-bound chapter.");
      return;
    }
    const next = included
      ? selectedChapterIds.filter((id) => id !== chapterId)
      : [...selectedChapterIds, chapterId];
    reviseProposal({ chapterIds: next });
  }, [reviseProposal, selectedChapterIds]);

  const moveChapter = useCallback((chapterId: string, delta: -1 | 1) => {
    const index = selectedChapterIds.indexOf(chapterId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= selectedChapterIds.length) return;
    const next = [...selectedChapterIds];
    [next[index], next[target]] = [next[target]!, next[index]!];
    reviseProposal({ chapterIds: next });
  }, [reviseProposal, selectedChapterIds]);

  const exportPublication = useCallback(() => {
    ledgerRef.current?.record("publication.exported");
    const receipt = ledgerRef.current?.receipt();
    const payload = {
      format: "axm-demonstration-publication/1",
      createdAt: new Date().toISOString(),
      program: SHOWCASE_PROGRAM,
      proposal,
      compiled: {
        programId: compiled.programId,
        programVersion: compiled.programVersion,
        productId: compiled.productId,
        editionId: compiled.edition.id,
        chapterIds: compiled.chapters.map((chapter) => chapter.id),
        evidenceIds: compiled.evidence.map((entry) => entry.id),
        totalDurationMs: compiled.totalDurationMs,
        aspect: compiled.aspect,
        autoplay: compiled.autoplay,
        loop: compiled.loop,
        clean: compiled.clean,
        sound: compiled.sound,
      },
      digest,
      liveUrl,
      runReceipt: receipt,
      authority: {
        proposalOnly: true,
        claimTextMutable: false,
        evidenceMutable: false,
        runtimeCodeGeneration: false,
        providerRuntimeDependency: false,
        telemetrySent: false,
        productAcceptanceIssued: false,
      },
    };
    downloadJson(
      `axm-infinite-fabric-${compiled.edition.id}-${Date.now()}.demonstration.json`,
      payload,
    );
    setNotice("Publication record exported with its proposal, evidence map, and run receipt.");
  }, [compiled, digest, liveUrl, proposal]);

  const copyLiveLink = useCallback(async () => {
    try {
      await copyText(liveUrl);
      ledgerRef.current?.record("link.copied");
      setNotice("Stable live link copied. The bounded proposal travels in the URL.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }, [liveUrl]);

  const removeVersion = useCallback((id: string) => {
    setVersions((current) => current.filter((version) => version.id !== id));
  }, []);

  return (
    <main className="demo-studio" data-testid="demonstration-studio">
      <header className="demo-studio__header">
        <div>
          <div className="demo-studio__eyebrow">AXM DEMONSTRATION FOUNDRY · SOURCE PROGRAM 1.0.0</div>
          <h1>Direct the proof. Keep the product.</h1>
        </div>
        <div className="demo-studio__status">
          <span>PROGRAM</span>
          <strong>{SHOWCASE_PROGRAM.id}</strong>
          <span>DIGEST</span>
          <strong>{digest ? digest.slice(0, 16) : "computing"}</strong>
          <span>TELEMETRY</span>
          <strong>OFF</strong>
        </div>
      </header>

      <div className="demo-studio__workspace">
        <aside className="demo-studio__controls" aria-label="Demonstration controls">
          <section className="demo-studio__section">
            <div className="demo-studio__section-title">
              <span>01</span>
              <h2>Direction</h2>
            </div>
            <label htmlFor="demo-direction">
              Describe the audience, duration, focus, aspect, sound, and operating mode.
            </label>
            <textarea
              id="demo-direction"
              value={direction}
              maxLength={600}
              onChange={(event) => setDirection(event.currentTarget.value)}
            />
            <button
              type="button"
              className="demo-studio__primary"
              disabled={busy}
              onClick={() => void applyDirection()}
            >
              {busy ? "compiling…" : "apply bounded direction"}
            </button>
            {directionResult && (
              <div className="demo-studio__tokens" aria-label="Matched direction controls">
                {directionResult.matchedControls.map((control) => (
                  <span key={control}>{control}</span>
                ))}
              </div>
            )}
            <p className="demo-studio__notice" role="status">{notice}</p>
          </section>

          <section className="demo-studio__section">
            <div className="demo-studio__section-title">
              <span>02</span>
              <h2>Edition</h2>
            </div>
            <div className="demo-studio__edition-grid">
              {SHOWCASE_EDITIONS.map((edition) => (
                <button
                  key={edition.id}
                  type="button"
                  aria-pressed={compiled.edition.id === edition.id}
                  onClick={() => selectEdition(edition.id)}
                >
                  <strong>{edition.label}</strong>
                  <small>{edition.summary}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="demo-studio__section">
            <div className="demo-studio__section-title">
              <span>03</span>
              <h2>Source chapters</h2>
            </div>
            <div className="demo-studio__chapters">
              {SHOWCASE_PROGRAM.chapters.map((chapter) => {
                const selectedIndex = selectedChapterIds.indexOf(chapter.id);
                const included = selectedIndex >= 0;
                return (
                  <div key={chapter.id} className="demo-studio__chapter" data-included={included}>
                    <label>
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => toggleChapter(chapter.id)}
                      />
                      <span>
                        <strong>{chapter.indexLabel} · {chapter.title}</strong>
                        <small>{chapter.claim}</small>
                      </span>
                    </label>
                    <div>
                      <button
                        type="button"
                        aria-label={`Move ${chapter.title} earlier`}
                        disabled={!included || selectedIndex === 0}
                        onClick={() => moveChapter(chapter.id, -1)}
                      >↑</button>
                      <button
                        type="button"
                        aria-label={`Move ${chapter.title} later`}
                        disabled={!included || selectedIndex === selectedChapterIds.length - 1}
                        onClick={() => moveChapter(chapter.id, 1)}
                      >↓</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="demo-studio__section">
            <div className="demo-studio__section-title">
              <span>04</span>
              <h2>Operating envelope</h2>
            </div>
            <label className="demo-studio__range">
              <span>Timing scale</span>
              <output>{(proposal.durationScale ?? compiled.edition.durationScale).toFixed(2)}× · {formatDuration(compiled.totalDurationMs)}</output>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.05"
                value={proposal.durationScale ?? compiled.edition.durationScale}
                onChange={(event) => reviseProposal({
                  durationScale: Number(event.currentTarget.value),
                })}
              />
            </label>
            <div className="demo-studio__aspect" aria-label="Capture aspect">
              {(["16:9", "4:5", "9:16"] as const).map((aspect) => (
                <button
                  key={aspect}
                  type="button"
                  aria-pressed={compiled.aspect === aspect}
                  onClick={() => reviseProposal({ aspect })}
                >{aspect}</button>
              ))}
            </div>
            <div className="demo-studio__toggles">
              {([
                ["autoplay", "Autoplay"],
                ["loop", "Loop"],
                ["clean", "Clean capture"],
                ["sound", "Sound"],
              ] as const).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={compiled[key]}
                    onChange={(event) => reviseProposal({
                      [key]: event.currentTarget.checked,
                    })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="demo-studio__section">
            <div className="demo-studio__section-title">
              <span>05</span>
              <h2>Evidence map</h2>
            </div>
            <div className="demo-studio__evidence">
              {compiled.evidence.map((entry) => (
                <details key={entry.id}>
                  <summary>
                    <span>{entry.kind}</span>
                    <strong>{entry.title}</strong>
                  </summary>
                  <p>{entry.claim}</p>
                  <code>{entry.locator}</code>
                </details>
              ))}
            </div>
          </section>

          <section className="demo-studio__section">
            <div className="demo-studio__section-title">
              <span>06</span>
              <h2>Publish and retain</h2>
            </div>
            <div className="demo-studio__actions">
              <button type="button" onClick={() => setPreviewNonce((value) => value + 1)}>
                refresh preview
              </button>
              <button type="button" onClick={() => void copyLiveLink()}>
                copy live link
              </button>
              <a
                data-testid="studio-live-link"
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
              >
                open live
              </a>
              <button type="button" disabled={busy} onClick={() => void saveVersion()}>
                save version
              </button>
              <button type="button" onClick={exportPublication}>
                export publication
              </button>
            </div>
          </section>

          <section className="demo-studio__section">
            <div className="demo-studio__section-title">
              <span>07</span>
              <h2>Local versions</h2>
            </div>
            {versions.length === 0 ? (
              <p className="demo-studio__empty">No retained versions in this browser.</p>
            ) : (
              <div className="demo-studio__versions">
                {versions.map((version) => (
                  <article key={version.id}>
                    <button type="button" onClick={() => restoreVersion(version)}>
                      <strong>{version.proposal.editionId}</strong>
                      <span>{formatDuration(
                        compileShowcaseProgram(version.proposal).totalDurationMs,
                      )}</span>
                      <small>{new Date(version.createdAt).toLocaleString()}</small>
                      <code>{version.digest.slice(0, 12)}</code>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${version.id}`}
                      onClick={() => removeVersion(version.id)}
                    >×</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>

        <section className="demo-studio__preview" aria-label="Live demonstration preview">
          <div className="demo-studio__preview-bar">
            <div>
              <span>LIVE PREVIEW</span>
              <strong>{compiled.edition.label} · {compiled.chapters.length} chapters · {formatDuration(compiled.totalDurationMs)}</strong>
            </div>
            <div>
              <span>{compiled.aspect}</span>
              <span>{compiled.clean ? "clean" : "operator"}</span>
              <span>{compiled.loop ? "loop" : "one pass"}</span>
            </div>
          </div>
          <div
            className="demo-studio__device"
            data-aspect={compiled.aspect}
            data-testid="studio-preview-device"
          >
            <iframe
              key={`${previewUrl}:${previewNonce}`}
              src={previewUrl}
              title="AXM Infinite Fabric demonstration preview"
              sandbox="allow-scripts allow-same-origin allow-downloads"
            />
          </div>
          <div className="demo-studio__control-line">
            <span>PROPOSAL</span>
            <code>{proposal.id}</code>
            <span>CLAIMS</span>
            <strong>source locked</strong>
            <span>PROVIDER</span>
            <strong>optional</strong>
            <span>RUNTIME</span>
            <strong>local capable</strong>
          </div>
        </section>
      </div>
    </main>
  );
}
