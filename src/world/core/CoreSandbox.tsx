import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { MeshBVH } from "three-mesh-bvh";
import { PlanetController } from "./PlanetController.js";
import type { ControllerState } from "./PlanetController.js";
import { PlayerCharacter } from "./PlayerCharacter.js";
import { FollowCamera } from "./FollowCamera.js";

const PLANET_RADIUS = 10;

function Scene(): JSX.Element {
  // Build the icosphere collider geometry once and attach a BVH to it.
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(PLANET_RADIUS, 8);
    geo.boundsTree = new MeshBVH(geo);
    return geo;
  }, []);

  const [collider, setCollider] = useState<THREE.Mesh | null>(null);

  // Latest controller state, read by the follow camera.
  const stateRef = useRef<ControllerState | null>(null);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 30, 10]} intensity={1.1} castShadow />
      <hemisphereLight args={["#bcd", "#332", 0.4]} />

      {/* Planet collider. Centered at origin, identity transform. */}
      <mesh
        ref={(m) => {
          if (m && m !== collider) setCollider(m);
        }}
        geometry={geometry}
      >
        <meshStandardMaterial color="#5a8f4e" flatShading />
      </mesh>

      <PlanetController
        collider={collider}
        config={{
          planetRadius: PLANET_RADIUS,
          gravity: 26,
          playerRadius: 0.35,
          playerHeight: 0.9,
        }}
        onState={(s) => {
          stateRef.current = s;
        }}
      >
        <PlayerCharacter />
      </PlanetController>

      <FollowCamera getState={() => stateRef.current} />
    </>
  );
}

/** Standalone, runnable scene that proves the core controller module. */
export function CoreSandbox(): JSX.Element {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0b0e14" }}>
      <Canvas camera={{ position: [0, 14, 18], fov: 55, near: 0.1, far: 1000 }} shadows>
        <Scene />
      </Canvas>
    </div>
  );
}
