import * as THREE from "three";
import { useCallback, useMemo, useRef } from "react";
import { generatePlanet, makeColliderBVH } from "./generatePlanet.js";

export interface PlanetProps {
  radius?: number;
  seed?: number;
  detail?: number;
  amplitude?: number;
  onColliderReady?: (mesh: THREE.Mesh) => void;
}

export function Planet(props: PlanetProps): JSX.Element {
  const { radius = 10, seed = 1234, detail = 5, amplitude, onColliderReady } = props;

  const geometry = useMemo(() => {
    const geo = generatePlanet({ radius, seed, detail, amplitude });
    makeColliderBVH(geo);
    return geo;
  }, [radius, seed, detail, amplitude]);

  const notified = useRef(false);

  const meshRef = useCallback(
    (mesh: THREE.Mesh | null) => {
      if (mesh && !notified.current) {
        notified.current = true;
        onColliderReady?.(mesh);
      }
    },
    [onColliderReady],
  );

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]}>
      <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
    </mesh>
  );
}
