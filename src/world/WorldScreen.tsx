// The 3D world: a walkable low-poly planet whose structures are an arc's
// challenge nodes. Walk the messenger up to a node and "Run Contract" resolves it
// through the deterministic engine (useArcWorld) — the node flips to cleared and
// engine state advances. Planet/controller/camera come from the two world modules;
// this file only composes them and wires interaction to the engine seam.

import { useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import type { Arc } from "../engine/types.js";
import { DEFAULT_WORLD_CONFIG, type WorldNode } from "./contract.js";
import { useArcWorld } from "./useArcWorld.js";
import { generatePlanet, makeColliderBVH } from "./planet/generatePlanet.js";
import { scatterOnPlanet } from "./planet/scatter.js";
import { Scatter } from "./planet/Scatter.js";
import { PlanetController, type ControllerState } from "./core/PlanetController.js";
import { PlayerCharacter } from "./core/PlayerCharacter.js";
import { FollowCamera } from "./core/FollowCamera.js";
import { NodeMarkers } from "./components/NodeMarkers.js";
import { Hud } from "./components/Hud.js";

const RADIUS = DEFAULT_WORLD_CONFIG.planetRadius;
const SEED = 7;
const NEAR_RANGE = 3.0;

interface ProximityProps {
  stateRef: React.MutableRefObject<ControllerState | null>;
  nodes: WorldNode[];
  onNear: (id: string | null) => void;
}

/** Each frame, find the nearest node to the player and report it when it changes. */
function ProximityWatch({ stateRef, nodes, onNear }: ProximityProps): null {
  const current = useRef<string | null>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const st = stateRef.current;
    if (!st) return;
    let bestId: string | null = null;
    let bestDist = NEAR_RANGE;
    for (const n of nodes) {
      tmp.set(n.position[0], n.position[1], n.position[2]);
      const d = tmp.distanceTo(st.position);
      if (d < bestDist) {
        bestDist = d;
        bestId = n.challengeId;
      }
    }
    if (bestId !== current.current) {
      current.current = bestId;
      onNear(bestId);
    }
  });
  return null;
}

export interface WorldScreenProps {
  arc?: Arc;
  onExit?: () => void;
}

export function WorldScreen({ arc, onExit }: WorldScreenProps): JSX.Element {
  const world = useArcWorld(arc);
  const [collider, setCollider] = useState<THREE.Mesh | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nearId, setNearId] = useState<string | null>(null);
  const stateRef = useRef<ControllerState | null>(null);

  const geometry = useMemo(() => {
    const g = generatePlanet({ radius: RADIUS, seed: SEED });
    makeColliderBVH(g);
    return g;
  }, []);
  const scatterItems = useMemo(() => scatterOnPlanet(geometry, RADIUS, 140, SEED), [geometry]);

  const config = useMemo(
    () => ({
      planetRadius: RADIUS,
      gravity: DEFAULT_WORLD_CONFIG.gravity,
      playerRadius: DEFAULT_WORLD_CONFIG.playerRadius,
      playerHeight: DEFAULT_WORLD_CONFIG.playerHeight,
    }),
    [],
  );

  const handleNear = useCallback((id: string | null) => {
    setNearId(id);
    if (id) setSelectedId(id);
  }, []);

  const setColliderRef = useCallback((m: THREE.Mesh | null) => {
    if (m) setCollider((prev) => prev ?? m);
  }, []);

  const selected = world.nodes.find((n) => n.challengeId === selectedId) ?? null;
  const atSelected = selected !== null && selected.challengeId === nearId;
  const canRun = atSelected && selected.status !== "locked";
  const party = selected ? world.partyFor(selected.challengeId) : [];

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0b0a08" }}>
      <Canvas camera={{ position: [0, RADIUS + 6, RADIUS + 12], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={["#0b0a08"]} />
        <fog attach="fog" args={["#0b0a08", RADIUS * 2.2, RADIUS * 4.2]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[25, 18, 12]} intensity={1.15} />
        <Stars radius={120} depth={40} count={1400} factor={4} fade speed={0.4} />

        <mesh ref={setColliderRef} geometry={geometry}>
          <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
        </mesh>
        <Scatter items={scatterItems} />
        <NodeMarkers nodes={world.nodes} selectedId={selectedId} nearId={nearId} onSelect={setSelectedId} />

        <PlanetController
          collider={collider}
          config={config}
          onState={(s) => {
            stateRef.current = s;
          }}
        >
          <PlayerCharacter />
        </PlanetController>
        <FollowCamera getState={() => stateRef.current} />
        <ProximityWatch stateRef={stateRef} nodes={world.nodes} onNear={handleNear} />
      </Canvas>

      <Hud
        title={world.arc.meta.name}
        cycle={world.cycle}
        resources={world.resources}
        selected={selected}
        party={party}
        near={atSelected}
        canRun={canRun}
        lastReport={world.lastReport}
        onRun={() => {
          if (selectedId) world.runChallenge(selectedId);
        }}
      />

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
