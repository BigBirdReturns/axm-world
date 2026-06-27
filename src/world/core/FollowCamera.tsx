import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { ControllerState } from "./PlanetController.js";

export interface FollowCameraProps {
  getState: () => ControllerState | null;
  /** Horizontal distance behind the target along -forward. */
  distance?: number;
  /** Height above the target along +up. */
  height?: number;
}

const DEFAULT_DISTANCE = 6;
const DEFAULT_HEIGHT = 2.5;
/** Damping rate; higher = snappier. */
const DAMP_LAMBDA = 6;

/**
 * Trails the controller: each frame the default camera is critically-damped
 * toward a point behind the target (along -forward, projected on the tangent
 * plane) lifted by `up * height`, and looks at the target with `camera.up`
 * aligned to the local up so the horizon stays sensible on a sphere.
 */
export function FollowCamera(props: FollowCameraProps): JSX.Element {
  const { getState } = props;
  const distance = props.distance ?? DEFAULT_DISTANCE;
  const height = props.height ?? DEFAULT_HEIGHT;

  const tmp = useMemo(
    () => ({
      forwardOnPlane: new THREE.Vector3(),
      desired: new THREE.Vector3(),
      target: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state, delta) => {
    const s = getState();
    if (!s) return;

    const cam = state.camera;
    const d = Math.min(delta, 1 / 30);

    // forward projected on the tangent plane (perpendicular to up).
    tmp.forwardOnPlane
      .copy(s.forward)
      .addScaledVector(s.up, -s.forward.dot(s.up));
    if (tmp.forwardOnPlane.lengthSq() < 1e-6) tmp.forwardOnPlane.copy(s.forward);
    tmp.forwardOnPlane.normalize();

    // Desired camera position: behind + above the target.
    tmp.desired
      .copy(s.position)
      .addScaledVector(tmp.forwardOnPlane, -distance)
      .addScaledVector(s.up, height);

    // Critically-damped lerp per-axis.
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tmp.desired.x, DAMP_LAMBDA, d);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, tmp.desired.y, DAMP_LAMBDA, d);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, tmp.desired.z, DAMP_LAMBDA, d);

    // Look slightly above the feet/center.
    tmp.target.copy(s.position).addScaledVector(s.up, 0.5);
    cam.up.copy(s.up);
    cam.lookAt(tmp.target);
  });

  return <></>;
}
