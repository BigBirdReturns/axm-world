// The 3D world: an arc's challenge nodes standing on a low-poly planet you orbit,
// tilt and zoom. Click a contract, assign a party from the roster, and Run it — which
// resolves through the deterministic engine (useArcWorld); the node flips to cleared
// and engine state advances. The planet/scatter come from the world modules; this
// file composes the scene, the orbit camera, and wires interaction to the engine seam.

import { useCallback, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { DEFAULT_WORLD_CONFIG, type WorldNode } from "./contract.js";
import { generatePlanet, makeColliderBVH } from "./planet/generatePlanet.js";
import { scatterOnPlanet } from "./planet/scatter.js";
import { Scatter } from "./planet/Scatter.js";
import { NodeMarkers } from "./components/NodeMarkers.js";
import { Hud } from "./components/Hud.js";
import { DecisionPanel } from "./components/DecisionPanel.js";
import { CartridgeObjectPanel } from "./components/CartridgeObjectPanel.js";
import type { ArcInteraction } from "./useArcInteraction.js";
import type { ArcWorld } from "./useArcWorld.js";

const RADIUS = DEFAULT_WORLD_CONFIG.planetRadius;
const SEED = 7;

export interface WorldScreenProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  onExit?: () => void;
}

/** Drop each node onto the actual displaced terrain (so markers don't float). */
function placeOnTerrain(nodes: WorldNode[], collider: THREE.Mesh | null): WorldNode[] {
  if (!collider) return nodes;
  const ray = new THREE.Raycaster();
  const from = new THREE.Vector3();
  const dir = new THREE.Vector3();
  return nodes.map((n) => {
    from.set(n.normal[0], n.normal[1], n.normal[2]).multiplyScalar(RADIUS * 1.8);
    dir.set(-n.normal[0], -n.normal[1], -n.normal[2]).normalize();
    ray.set(from, dir);
    const hit = ray.intersectObject(collider, false)[0];
    if (!hit) return n;
    return { ...n, position: [hit.point.x, hit.point.y, hit.point.z] };
  });
}

export function WorldScreen({ world, interaction: ix, onExit }: WorldScreenProps): JSX.Element {
  const [collider, setCollider] = useState<THREE.Mesh | null>(null);
  const [showCartridge, setShowCartridge] = useState(false);

  const geometry = useMemo(() => {
    const g = generatePlanet({ radius: RADIUS, seed: SEED });
    makeColliderBVH(g);
    return g;
  }, []);
  const scatterItems = useMemo(() => scatterOnPlanet(geometry, RADIUS, 140, SEED), [geometry]);
  const placedNodes = useMemo(() => placeOnTerrain(world.nodes, collider), [world.nodes, collider]);

  const setColliderRef = useCallback((m: THREE.Mesh | null) => {
    if (m) setCollider((prev) => prev ?? m);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0b0a08" }}>
      <Canvas camera={{ position: [0, RADIUS * 0.7, RADIUS * 2.6], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={["#0b0a08"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[25, 18, 12]} intensity={1.2} />
        <Stars radius={120} depth={40} count={1400} factor={4} fade speed={0.4} />

        <mesh ref={setColliderRef} geometry={geometry}>
          <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
        </mesh>
        <Scatter items={scatterItems} />
        <NodeMarkers nodes={placedNodes} selectedId={ix.selectedId} onSelect={ix.select} />

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          zoomSpeed={0.9}
          minDistance={RADIUS + 2.5}
          maxDistance={RADIUS * 4.5}
        />
      </Canvas>

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
      />

      {/* one-line legend so the controls read immediately */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 14,
          font: "11px/1.4 'IBM Plex Mono', ui-monospace, monospace",
          color: "#a59c8b",
          pointerEvents: "none",
        }}
      >
        drag to orbit · scroll to zoom · right-drag to pan · click a ◆ contract
      </div>

      <button
        onClick={() => setShowCartridge(true)}
        style={{
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "auto",
          font: "600 13px 'IBM Plex Mono', ui-monospace, monospace",
          background: "rgba(23,21,15,0.8)",
          color: "#c9a14a",
          border: "1px solid #4a4238",
          borderRadius: 6,
          padding: "6px 12px",
          cursor: "pointer",
        }}
      >
        ◧ Cartridge
      </button>

      {world.pendingDecision && (
        <DecisionPanel key={world.pendingDecision.id} card={world.pendingDecision} onResolve={world.resolveDecision} />
      )}

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
