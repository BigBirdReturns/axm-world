import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { EmbodimentMotionState, WorldAvatarAppearance } from "../themes/appearance.js";

export interface PlayerCharacterProps {
  appearance: WorldAvatarAppearance;
  motion: EmbodimentMotionState;
}

/** Theme-owned low-poly embodiment. Motion is presentation-safe controller state;
 * no role, encounter rule, or engine outcome is inferred here. */
export function PlayerCharacter({ appearance, motion }: PlayerCharacterProps): JSX.Element {
  const bodyRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const body = bodyRef.current;
    if (!body) return;
    const t = state.clock.elapsedTime;
    const walking = motion === "walk";
    const arrived = motion === "arrived";
    body.position.y = motion === "airborne" ? 0.08 : Math.sin(t * (walking ? 10 : 3)) * (walking ? 0.045 : 0.012);
    body.rotation.z = arrived ? Math.sin(t * 4) * 0.045 : Math.sin(t * (walking ? 10 : 3)) * (walking ? 0.025 : 0.008);
    const stride = walking ? Math.sin(t * 10) * 0.48 : 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = stride;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -stride;
  });

  const { palette, modules } = appearance;
  return (
    <group ref={bodyRef} data-appearance={appearance.id} data-motion={motion}>
      <mesh position={[0, 0.55, 0]} castShadow><capsuleGeometry args={[0.22, 0.5, 4, 8]} /><meshStandardMaterial color={palette.body} flatShading /></mesh>
      <mesh position={[0, 1.05, 0]} castShadow><sphereGeometry args={[0.18, 12, 10]} /><meshStandardMaterial color={palette.skin} flatShading /></mesh>
      {modules.headgear === "cap" && <mesh position={[0, 1.18, 0]} castShadow><coneGeometry args={[0.2, 0.14, 8]} /><meshStandardMaterial color={palette.headgear} flatShading /></mesh>}
      {modules.headgear === "hood" && <mesh position={[0, 1.07, 0]} castShadow><sphereGeometry args={[0.23, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.72]} /><meshStandardMaterial color={palette.headgear} flatShading /></mesh>}
      <mesh ref={leftLegRef} position={[-0.1, 0.18, 0]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.36, 6]} /><meshStandardMaterial color={palette.legs} flatShading /></mesh>
      <mesh ref={rightLegRef} position={[0.1, 0.18, 0]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.36, 6]} /><meshStandardMaterial color={palette.legs} flatShading /></mesh>
      {modules.cargo !== "none" && <mesh position={[0.28, 0.6, 0.05]} rotation={[0, 0, 0.2]} castShadow><boxGeometry args={modules.cargo === "pack" ? [0.22, 0.3, 0.16] : [0.18, 0.22, 0.12]} /><meshStandardMaterial color={palette.cargo} flatShading /></mesh>}
      {modules.cargo === "satchel" && <mesh position={[0.05, 0.8, 0.02]} rotation={[0, 0, 1.0]} castShadow><torusGeometry args={[0.24, 0.025, 6, 16, Math.PI]} /><meshStandardMaterial color={palette.strap} flatShading /></mesh>}
    </group>
  );
}
