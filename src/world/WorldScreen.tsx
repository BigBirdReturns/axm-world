// Planet scene: the spatial representation of an arc — challenge nodes standing on a
// low-poly planet you orbit, tilt and zoom. This is ONLY the representation: it fills
// the shell's active-representation region and renders the engine's nodes through the
// shared interaction seam. All chrome (status, roster, contract, report, decision,
// cartridge) belongs to the Shell, not here — so every costume is just a view of the
// same run.

import { useCallback, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { DEFAULT_WORLD_CONFIG, type WorldNode } from "./contract.js";
import { generatePlanet, makeColliderBVH } from "./planet/generatePlanet.js";
import { scatterOnPlanet } from "./planet/scatter.js";
import { Scatter } from "./planet/Scatter.js";
import { NodeMarkers } from "./components/NodeMarkers.js";
import type { ArcInteraction } from "./useArcInteraction.js";
import type { ArcWorld } from "./useArcWorld.js";

const RADIUS = DEFAULT_WORLD_CONFIG.planetRadius;
const SEED = 7;

export interface SceneProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  modalOpen?: boolean;
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

export function PlanetScene({ world, interaction: ix, modalOpen = false }: SceneProps): JSX.Element {
  const [collider, setCollider] = useState<THREE.Mesh | null>(null);

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
    <Canvas style={{ position: "absolute", inset: 0, pointerEvents: modalOpen ? "none" : "auto" }} camera={{ position: [0, RADIUS * 0.7, RADIUS * 2.6], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#0b0a08"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[25, 18, 12]} intensity={1.2} />
      <Stars radius={120} depth={40} count={1400} factor={4} fade speed={0.4} />

      <mesh ref={setColliderRef} geometry={geometry}>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
      </mesh>
      <Scatter items={scatterItems} />
      <NodeMarkers nodes={placedNodes} selectedId={ix.selectedId} onSelect={ix.select} labelsEnabled={!modalOpen} />

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
  );
}
