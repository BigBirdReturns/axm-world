// The 3D world: an arc's challenge nodes standing on a low-poly planet you orbit,
// tilt and zoom. Click a contract, assign a party from the roster, and Run it — which
// resolves through the deterministic engine (useArcWorld); the node flips to cleared
// and engine state advances. The planet/scatter come from the world modules; this
// file composes the scene, the orbit camera, and wires interaction to the engine seam.

import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { Arc } from "../engine/types.js";
import { DEFAULT_WORLD_CONFIG, type WorldNode } from "./contract.js";
import { useArcWorld } from "./useArcWorld.js";
import { generatePlanet, makeColliderBVH } from "./planet/generatePlanet.js";
import { scatterOnPlanet } from "./planet/scatter.js";
import { Scatter } from "./planet/Scatter.js";
import { NodeMarkers } from "./components/NodeMarkers.js";
import { Hud } from "./components/Hud.js";

const RADIUS = DEFAULT_WORLD_CONFIG.planetRadius;
const SEED = 7;

export interface WorldScreenProps {
  arc?: Arc;
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

export function WorldScreen({ arc, onExit }: WorldScreenProps): JSX.Element {
  const world = useArcWorld(arc);
  const [collider, setCollider] = useState<THREE.Mesh | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [party, setParty] = useState<string[]>([]);

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

  // When the player picks a different contract, seed the party with the engine's
  // recommendation; they can then add/remove members.
  useEffect(() => {
    setParty(selectedId ? world.recommendedParty(selectedId) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const toggleAgent = useCallback(
    (id: string) => {
      setParty((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        const max = selectedId ? world.reqFor(selectedId).maxAgents : 0;
        if (prev.length >= max) return prev;
        return [...prev, id];
      });
    },
    [selectedId, world],
  );

  const selected = selectedId ? world.nodes.find((n) => n.challengeId === selectedId) ?? null : null;
  const req = selectedId ? world.reqFor(selectedId) : null;
  const canRun =
    selected !== null &&
    selected.status === "available" &&
    req !== null &&
    party.length >= req.minAgents &&
    party.length <= req.maxAgents;

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
        <NodeMarkers nodes={placedNodes} selectedId={selectedId} onSelect={setSelectedId} />

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
        selected={selected}
        req={req}
        roster={world.roster}
        party={party}
        onToggleAgent={toggleAgent}
        canRun={canRun}
        onRun={() => {
          if (selectedId) world.runChallenge(selectedId, party);
        }}
        lastReport={world.lastReport}
      />

      {/* one-line legend so the controls read immediately */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 14,
          font: "11px/1.4 'IBM Plex Mono', ui-monospace, monospace",
          color: "#6e675a",
          pointerEvents: "none",
        }}
      >
        drag to orbit · scroll to zoom · right-drag to pan · click a ◆ contract
      </div>

      {onExit && (
        <button
          onClick={onExit}
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "auto",
            font: "600 13px 'IBM Plex Mono', ui-monospace, monospace",
            background: "rgba(23,21,15,0.8)",
            color: "#a59c8b",
            border: "1px solid #4a4238",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          ← Exit world
        </button>
      )}
    </div>
  );
}
