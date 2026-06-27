import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * A simple low-poly courier avatar built from primitive geometries.
 * Feet rest at the group origin; +Y is up. The whole body gets a subtle
 * sine "walk bob" so it reads as alive even while idle.
 */
export function PlayerCharacter(): JSX.Element {
  const bobRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = bobRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = Math.sin(t * 6) * 0.03;
    g.rotation.z = Math.sin(t * 6) * 0.02;
  });

  return (
    <group ref={bobRef}>
      {/* Body: capsule sitting on its legs. */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
        <meshStandardMaterial color="#3b6ea5" flatShading />
      </mesh>

      {/* Head. */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial color="#e8c4a0" flatShading />
      </mesh>

      {/* Cap. */}
      <mesh position={[0, 1.18, 0]} castShadow>
        <coneGeometry args={[0.2, 0.14, 8]} />
        <meshStandardMaterial color="#c8492f" flatShading />
      </mesh>

      {/* Legs. */}
      <mesh position={[-0.1, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.36, 6]} />
        <meshStandardMaterial color="#2a2f3a" flatShading />
      </mesh>
      <mesh position={[0.1, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.36, 6]} />
        <meshStandardMaterial color="#2a2f3a" flatShading />
      </mesh>

      {/* Mailbag slung on the side. */}
      <mesh position={[0.28, 0.6, 0.05]} rotation={[0, 0, 0.2]} castShadow>
        <boxGeometry args={[0.18, 0.22, 0.12]} />
        <meshStandardMaterial color="#7a5230" flatShading />
      </mesh>
      {/* Bag strap. */}
      <mesh position={[0.05, 0.8, 0.02]} rotation={[0, 0, 1.0]} castShadow>
        <torusGeometry args={[0.24, 0.025, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#5a3c22" flatShading />
      </mesh>
    </group>
  );
}
