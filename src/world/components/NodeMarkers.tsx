// Renders the arc's challenge nodes as labelled structures standing on the planet
// surface, oriented so their base sits flush to the ground (local +Y along the
// surface normal). Color + label encode status; the selected node is emphasized.
// Click a node to select it.

import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { PlayNodeStatus, WorldNode } from "../contract.js";

const STATUS_COLOR: Record<PlayNodeStatus, string> = {
  available: "#c9a14a",
  locked: "#5e5850",
  cleared: "#74ad77",
};

const STATUS_GLYPH: Record<PlayNodeStatus, string> = {
  available: "◆",
  locked: "◇",
  cleared: "✓",
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
  onSelect: (challengeId: string) => void;
  labelsEnabled?: boolean;
  /** The planet mesh. When given, a node's label hides while the node is on the far
   *  side of the globe, so labels stop floating over the front (representation honesty:
   *  a label is only shown for a node you can actually see). */
  occluder?: THREE.Object3D | null;
}

export function NodeMarkers(props: Props): JSX.Element {
  const { nodes, selectedId, onSelect, labelsEnabled = true, occluder = null } = props;
  const occludeRefs = useMemo(() => (occluder ? [{ current: occluder }] : undefined), [occluder]);

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
        return (
          <group key={node.id} position={node.position} quaternion={quaternion}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.11, 0.9, 6]} />
              <meshStandardMaterial color="#2a2620" roughness={0.9} />
            </mesh>
            <mesh
              position={[0, 1.15, 0]}
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
              scale={selected ? 1.45 : 1}
            >
              <octahedronGeometry args={[0.34, 0]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={selected ? 1.0 : 0.25}
                roughness={0.4}
                metalness={0.1}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[0.42, 0.58, 22]} />
              <meshBasicMaterial color={color} transparent opacity={selected ? 0.85 : 0.4} side={THREE.DoubleSide} />
            </mesh>
            {labelsEnabled && (
              // The selected node always shows its label (never occluded), so the
              // current choice stays legible even near the globe's limb.
              <Html position={[0, 1.7, 0]} center distanceFactor={16} zIndexRange={[5, 0]} occlude={selected ? undefined : occludeRefs}>
                <button
                  type="button"
                  className="node-label"
                  data-testid={`node-label-${node.challengeId}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(node.challengeId);
                  }}
                  style={{
                    font: "600 11px 'IBM Plex Mono', ui-monospace, monospace",
                    whiteSpace: "nowrap",
                    color: "#ece4d4",
                    background: selected ? "rgba(176,28,24,0.92)" : "rgba(23,21,15,0.82)",
                    border: `1px solid ${color}`,
                    borderRadius: 5,
                    padding: "6px 9px",
                    minHeight: 32,
                    minWidth: 44,
                    transform: "translateY(-2px)",
                    userSelect: "none",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ color }}>{STATUS_GLYPH[node.status]}</span> {node.title}
                  <span style={{ color: "#a59c8b" }}> · {node.difficulty}</span>
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
