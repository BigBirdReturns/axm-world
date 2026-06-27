// Renders the arc's challenge nodes as structures standing on the planet surface,
// oriented so their base sits flush to the ground (local +Y along the surface
// normal). Color encodes status; the selected / nearby node is emphasized.

import { useMemo } from "react";
import * as THREE from "three";
import type { PlayNodeStatus, WorldNode } from "../contract.js";

const STATUS_COLOR: Record<PlayNodeStatus, string> = {
  available: "#c9a14a",
  locked: "#5e5850",
  cleared: "#74ad77",
};

const UP = new THREE.Vector3(0, 1, 0);

interface MarkerData {
  node: WorldNode;
  quaternion: [number, number, number, number];
  color: string;
}

interface Props {
  nodes: WorldNode[];
  selectedId: string | null;
  nearId: string | null;
  onSelect: (challengeId: string) => void;
}

export function NodeMarkers(props: Props): JSX.Element {
  const { nodes, selectedId, nearId, onSelect } = props;

  const markers = useMemo<MarkerData[]>(() => {
    const tmp = new THREE.Vector3();
    return nodes.map((node) => {
      tmp.set(node.normal[0], node.normal[1], node.normal[2]).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(UP, tmp);
      return { node, quaternion: [q.x, q.y, q.z, q.w], color: STATUS_COLOR[node.status] };
    });
  }, [nodes]);

  return (
    <group>
      {markers.map(({ node, quaternion, color }) => {
        const selected = node.challengeId === selectedId;
        const near = node.challengeId === nearId;
        const emphasis = selected || near;
        return (
          <group key={node.id} position={node.position} quaternion={quaternion}>
            {/* post */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.12, 1, 6]} />
              <meshStandardMaterial color="#2a2620" roughness={0.9} />
            </mesh>
            {/* beacon */}
            <mesh
              position={[0, 1.25, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(node.challengeId);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
              }}
              scale={emphasis ? 1.35 : 1}
            >
              <octahedronGeometry args={[0.34, 0]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={selected ? 0.9 : near ? 0.5 : 0.15}
                roughness={0.4}
                metalness={0.1}
              />
            </mesh>
            {/* ground ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[0.45, 0.6, 20]} />
              <meshBasicMaterial color={color} transparent opacity={emphasis ? 0.8 : 0.35} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
