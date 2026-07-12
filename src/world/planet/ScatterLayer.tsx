import * as THREE from "three";
import { useMemo } from "react";
import type { ScatterItem } from "./scatter.js";

interface ScatterProps {
  items: ScatterItem[];
}

const TREE_LEAF_COLOR = new THREE.Color(0.24, 0.4, 0.22);
const TREE_TRUNK_COLOR = new THREE.Color(0.35, 0.25, 0.16);
const ROCK_COLOR = new THREE.Color(0.5, 0.48, 0.46);

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _mat = new THREE.Matrix4();

/** Build an InstancedMesh from a geometry/material and a list of items. */
function useInstanced(
  items: ScatterItem[],
  kind: "tree" | "rock",
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  yOffset: number,
): THREE.InstancedMesh | null {
  return useMemo(() => {
    const subset = items.filter((it) => it.kind === kind);
    if (subset.length === 0) return null;

    const mesh = new THREE.InstancedMesh(geometry, material, subset.length);
    mesh.frustumCulled = false;

    for (let i = 0; i < subset.length; i++) {
      const it = subset[i];
      if (!it) continue;
      _pos.set(it.position[0], it.position[1], it.position[2]);
      _quat.set(it.quaternion[0], it.quaternion[1], it.quaternion[2], it.quaternion[3]);
      _scale.setScalar(it.scale);

      // Lift along the item's local up so the base sits on the surface.
      if (yOffset !== 0) {
        const localUp = new THREE.Vector3(0, yOffset * it.scale, 0).applyQuaternion(_quat);
        _pos.add(localUp);
      }

      _mat.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(i, _mat);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, kind, geometry, material, yOffset]);
}

export function ScatterLayer(props: ScatterProps): JSX.Element {
  const { items } = props;

  // Shared geometries / materials (memoized once).
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.16, 0.6, 5), []);
  const leafGeo = useMemo(() => new THREE.ConeGeometry(0.55, 1.4, 6), []);
  const rockGeo = useMemo(() => new THREE.IcosahedronGeometry(0.5, 0), []);

  const trunkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: TREE_TRUNK_COLOR, flatShading: true, roughness: 1, metalness: 0 }),
    [],
  );
  const leafMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: TREE_LEAF_COLOR, flatShading: true, roughness: 1, metalness: 0 }),
    [],
  );
  const rockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: ROCK_COLOR, flatShading: true, roughness: 1, metalness: 0 }),
    [],
  );

  // Trees are two instanced meshes (trunk + leaves) sharing item transforms.
  const trunkMesh = useInstanced(items, "tree", trunkGeo, trunkMat, 0.3);
  const leafMesh = useInstanced(items, "tree", leafGeo, leafMat, 1.1);
  const rockMesh = useInstanced(items, "rock", rockGeo, rockMat, 0.2);

  return (
    <group>
      {trunkMesh ? <primitive object={trunkMesh} /> : null}
      {leafMesh ? <primitive object={leafMesh} /> : null}
      {rockMesh ? <primitive object={rockMesh} /> : null}
    </group>
  );
}
