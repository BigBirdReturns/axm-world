// The run-graph costume: a generic engine grammar, not a themed world map.
// Nodes are engine-resolvable work items; edges show prerequisite flow; colors mark
// available/locked/cleared run state; party pawns show the pending assignment.
// Cartridge-specific fiction lives in labels/descriptions, not in this layer.

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Line, Html, ContactShadows } from "@react-three/drei";
import type { PlayNode } from "../../play-pipeline/compile.js";
import { Hud } from "../components/Hud.js";
import { DecisionPanel } from "../components/DecisionPanel.js";
import { CartridgeObjectPanel } from "../components/CartridgeObjectPanel.js";
import { CartridgeButton } from "../components/CartridgeButton.js";
import { useIsMobile } from "../use-viewport.js";
import type { ArcInteraction } from "../useArcInteraction.js";
import type { ArcWorld } from "../useArcWorld.js";

const STATUS_COLOR: Record<PlayNode["status"], string> = {
  available: "#c9a14a",
  locked: "#5e5850",
  cleared: "#74ad77",
};
const STATUS_GLYPH: Record<PlayNode["status"], string> = {
  available: "◆",
  locked: "◇",
  cleared: "✓",
};

export interface BoardScreenProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  onExit?: () => void;
}

interface Placed {
  node: PlayNode;
  x: number;
  z: number;
}

const TARGET_SPAN = 42; // board units the larger axis maps to

export function BoardScreen({ world, interaction: ix, onExit }: BoardScreenProps): JSX.Element {
  const scene = world.scene;
  const [showCartridge, setShowCartridge] = useState(false);
  const isMobile = useIsMobile();

  const board = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const n of scene.nodes) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minZ = Math.min(minZ, n.y); maxZ = Math.max(maxZ, n.y);
    }
    if (!isFinite(minX)) { minX = 0; maxX = 1; minZ = 0; maxZ = 1; }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const spanX = Math.max(1, maxX - minX), spanZ = Math.max(1, maxZ - minZ);
    const s = TARGET_SPAN / Math.max(spanX, spanZ);
    const pts: Placed[] = scene.nodes.map((node) => ({ node, x: (node.x - cx) * s, z: (node.y - cz) * s }));
    const halfX = (spanX * s) / 2 + 6;
    const halfZ = (spanZ * s) / 2 + 6;
    const extent = Math.max(halfX, halfZ);
    return { pts, halfX, halfZ, extent };
  }, [scene]);

  const edges = useMemo(() => {
    const out: Array<[[number, number, number], [number, number, number]]> = [];
    for (let i = 0; i < board.pts.length - 1; i++) {
      const a = board.pts[i];
      const b = board.pts[i + 1];
      if (!a || !b) continue;
      out.push([[a.x, 0.14, a.z], [b.x, 0.14, b.z]]);
    }
    return out;
  }, [board]);

  const selectedPlaced = board.pts.find((p) => p.node.challengeId === ix.selectedId) ?? null;
  const ext = board.extent;

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0b0a08" }}>
      <Canvas shadows camera={{ position: [0, ext * 1.45, ext * 1.65], fov: 38 }} dpr={[1, 2]}>
        <color attach="background" args={["#0b0a08"]} />
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[ext * 0.7, ext * 1.4, ext * 0.5]}
          intensity={1.6}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        >
          <orthographicCamera attach="shadow-camera" args={[-ext * 1.6, ext * 1.6, ext * 1.6, -ext * 1.6, 0.1, ext * 5]} />
        </directionalLight>
        <hemisphereLight args={["#6b7a8a", "#2a2620", 0.4]} />

        {/* the table */}
        <RoundedBox args={[board.halfX * 2, 1.8, board.halfZ * 2]} radius={0.7} smoothness={4} position={[0, -0.9, 0]} receiveShadow castShadow>
          <meshStandardMaterial color="#3a3026" roughness={0.9} />
        </RoundedBox>
        {/* felt inset (reads clearly against the black void) */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[board.halfX * 2 - 1.6, board.halfZ * 2 - 1.6]} />
          <meshStandardMaterial color="#26352a" roughness={1} />
        </mesh>

        {/* prerequisite flow: edges are dependency/readiness, not avatar traversal roads. */}
        {edges.map((seg, i) => (
          <Line key={i} points={seg} color="#8a8270" lineWidth={2.5} dashed dashScale={2.5} />
        ))}

        {/* engine nodes */}
        {board.pts.map(({ node, x, z }) => {
          const selected = node.challengeId === ix.selectedId;
          const justRecorded = world.lastReport?.challengeId === node.challengeId && node.status === "cleared";
          const color = STATUS_COLOR[node.status];
          return (
            <group key={node.id} position={[x, 0, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <circleGeometry args={[1.7, 28]} />
                <meshStandardMaterial color={color} transparent opacity={selected ? 0.85 : 0.35} roughness={1} />
              </mesh>
              <RoundedBox
                args={[2.4, 2.8, 0.3]}
                radius={0.13}
                smoothness={3}
                position={[0, 1.6, 0]}
                scale={justRecorded ? 1.24 : selected ? 1.14 : 1}
                castShadow
                onClick={(e) => { e.stopPropagation(); ix.select(node.challengeId); }}
                onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
                onPointerOut={() => { document.body.style.cursor = "auto"; }}
              >
                <meshStandardMaterial
                  color={selected ? "#241f18" : "#2c2720"}
                  emissive={color}
                  emissiveIntensity={justRecorded ? 0.85 : selected ? 0.55 : node.status === "available" ? 0.22 : 0.06}
                  roughness={0.6}
                />
              </RoundedBox>
              <mesh position={[0, 2.55, 0.22]}>
                <octahedronGeometry args={[0.28, 0]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
              </mesh>
              {/* The label is part of the node: it must select like the card does,
                  not be a dead target. Enable pointer events and route clicks to the
                  same select(); stop propagation so the click doesn't fall through to
                  the canvas / orbit controls. */}
              <Html position={[0, 1.55, 0.28]} center distanceFactor={ext * 0.9}>
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); ix.select(node.challengeId); }}
                  style={{ width: 130, textAlign: "center", font: "600 12px 'IBM Plex Mono', ui-monospace, monospace", color: "#ece4d4", userSelect: "none", cursor: "pointer" }}
                >
                  <div style={{ color }}>{STATUS_GLYPH[node.status]} {node.difficulty}</div>
                  <div style={{ lineHeight: 1.2, marginTop: 2 }}>{node.title}</div>
                  {justRecorded && <div style={{ marginTop: 4, color: "#74ad77", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>recorded</div>}
                </div>
              </Html>
            </group>
          );
        })}

        {/* party pawns at the selected contract */}
        {selectedPlaced &&
          ix.party.map((id, i) => {
            const n = ix.party.length;
            const px = selectedPlaced.x + (i - (n - 1) / 2) * 1.0;
            const pz = selectedPlaced.z + 2.4;
            return (
              <group key={id} position={[px, 0, pz]}>
                <mesh position={[0, 0.5, 0]} castShadow>
                  <capsuleGeometry args={[0.24, 0.45, 4, 8]} />
                  <meshStandardMaterial color="#c9a14a" roughness={0.7} />
                </mesh>
                <mesh position={[0, 1.05, 0]} castShadow>
                  <sphereGeometry args={[0.22, 12, 12]} />
                  <meshStandardMaterial color="#e8dcc0" roughness={0.7} />
                </mesh>
              </group>
            );
          })}

        <ContactShadows position={[0, 0.06, 0]} opacity={0.55} scale={ext * 2.6} blur={2.6} far={8} />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          enableDamping
          dampingFactor={0.08}
          target={[0, 0.5, 0]}
          minPolarAngle={0.2}
          maxPolarAngle={1.05}
          minDistance={ext * 0.9}
          maxDistance={ext * 3}
        />
      </Canvas>

      {/* tilt-shift vignette to focus the diorama */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(125% 95% at 50% 45%, transparent 50%, rgba(11,10,8,0.6) 100%)" }} />

      <Hud
        title={world.arc.meta.name}
        cycle={world.cycle}
        resources={world.resources}
        progress={{ cleared: world.clearedCount, total: world.totalNodes }}
        arcComplete={world.arcComplete}
        selected={ix.selected}
        req={ix.req}
        roster={world.roster}
        party={ix.party}
        onToggleAgent={ix.toggleAgent}
        onApplyDowntime={world.applyDowntime}
        canRun={ix.canRun}
        onRun={ix.run}
        lastReport={world.lastReport}
        dispatches={world.dispatches}
        pendingDecision={world.pendingDecision !== null}
        contract={ix.contract}
        readiness={ix.readiness}
        recommendation={ix.recommendation}
      />

      {!isMobile && (
        <div style={{ position: "absolute", bottom: 14, left: 14, font: "11px/1.4 'IBM Plex Mono', ui-monospace, monospace", color: "#a59c8b", pointerEvents: "none" }}>
          run graph: gold ◆ available · gray ◇ locked by requirements · green ✓ recorded on this cartridge
        </div>
      )}

      <CartridgeButton onClick={() => setShowCartridge(true)} />

      {/* the authored opening decision (and any pending drama) — engine resolves it */}
      {world.pendingDecision && (
        <DecisionPanel key={world.pendingDecision.id} card={world.pendingDecision} onResolve={world.resolveDecision} />
      )}

      {/* the cartridge as an object: run state + export; the exit path */}
      {showCartridge && (
        <CartridgeObjectPanel
          manifest={world.cartridge.manifest}
          openingChoice={world.openingChoice}
          cycle={world.cycle}
          clearedCount={world.clearedCount}
          totalNodes={world.totalNodes}
          onExport={world.buildExport}
          onClose={() => setShowCartridge(false)}
          onLeave={() => onExit?.()}
        />
      )}
    </div>
  );
}
