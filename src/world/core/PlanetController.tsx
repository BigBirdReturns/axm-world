import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
// Importing the package augments THREE.BufferGeometry with `boundsTree?: MeshBVH`.
import "three-mesh-bvh";
import { useWorldInput } from "./input.js";
import type { EmbodimentMotionState } from "../themes/appearance.js";

export interface ControllerConfig {
  planetRadius: number;
  gravity: number;
  playerRadius: number;
  playerHeight: number;
  moveSpeed?: number;
  jumpSpeed?: number;
}

export interface ControllerState {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  up: THREE.Vector3;
  forward: THREE.Vector3;
  grounded: boolean;
  speed: number;
  motion: Exclude<EmbodimentMotionState, "arrived">;
}

export interface PlanetControllerProps {
  collider: THREE.Mesh | null;
  config: ControllerConfig;
  initialPosition?: [number, number, number];
  children?: React.ReactNode;
  onState?: (s: ControllerState) => void;
}

const DEFAULT_MOVE_SPEED = 4;
const DEFAULT_JUMP_SPEED = 9;

export function PlanetController(props: PlanetControllerProps): JSX.Element {
  const { collider, config, initialPosition, children, onState } = props;

  const input = useWorldInput();
  const groupRef = useRef<THREE.Group>(null);

  // --- Persistent simulation state (mutated in place across frames) ---
  const sim = useMemo(() => {
    // Start on the surface "north-ish" of the planet so the player spawns above ground.
    const start = initialPosition
      ? new THREE.Vector3(...initialPosition)
      : new THREE.Vector3(0, config.planetRadius + config.playerHeight, 0);
    return {
      position: start.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      yaw: 0,
      wasJumpDown: false,
      grounded: false,
      speed: 0,
      motion: "idle",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Stable scratch objects (no per-frame allocation) ---
  const tmp = useMemo(
    () => ({
      up: new THREE.Vector3(),
      gravityDir: new THREE.Vector3(),
      east: new THREE.Vector3(),
      north: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      moveDir: new THREE.Vector3(),
      impulseDir: new THREE.Vector3(),
      worldUpRef: new THREE.Vector3(0, 1, 0),
      altUpRef: new THREE.Vector3(1, 0, 0),
      // collision
      segment: new THREE.Line3(),
      capsuleBox: new THREE.Box3(),
      triPoint: new THREE.Vector3(),
      capsulePoint: new THREE.Vector3(),
      pushDir: new THREE.Vector3(),
      totalPush: new THREE.Vector3(),
      footBefore: new THREE.Vector3(),
      // orientation
      basis: new THREE.Matrix4(),
      zAxis: new THREE.Vector3(),
      xAxis: new THREE.Vector3(),
      // velocity helpers
      vUp: new THREE.Vector3(),
      vHoriz: new THREE.Vector3(),
      footPos: new THREE.Vector3(),
    }),
    [],
  );

  // Reused output state object handed to onState each frame.
  const outState = useMemo<ControllerState>(
    () => ({
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      up: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      grounded: false,
      speed: 0,
      motion: "idle",
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    // Clamp delta to avoid tunneling on frame hitches / tab switches.
    const delta = Math.min(rawDelta, 1 / 30);
    const moveSpeed = config.moveSpeed ?? DEFAULT_MOVE_SPEED;
    const jumpSpeed = config.jumpSpeed ?? DEFAULT_JUMP_SPEED;
    const radius = config.playerRadius;

    const inp = input.read();

    // up = direction from origin to player (origin is the planet center).
    tmp.up.copy(sim.position);
    if (tmp.up.lengthSq() < 1e-8) tmp.up.set(0, 1, 0);
    tmp.up.normalize();
    tmp.gravityDir.copy(tmp.up).multiplyScalar(-1);

    // --- Heading on the tangent plane ---
    sim.yaw += inp.turn;

    // Build a stable tangent basis (east/north) around `up`.
    // Pick a reference not parallel to up.
    const ref =
      Math.abs(tmp.up.dot(tmp.worldUpRef)) > 0.99 ? tmp.altUpRef : tmp.worldUpRef;
    tmp.east.crossVectors(ref, tmp.up).normalize();
    tmp.north.crossVectors(tmp.up, tmp.east).normalize();

    // forward = yaw-rotated heading in the tangent plane (north at yaw 0).
    const cy = Math.cos(sim.yaw);
    const sy = Math.sin(sim.yaw);
    tmp.forward
      .copy(tmp.north).multiplyScalar(cy)
      .addScaledVector(tmp.east, sy)
      .normalize();

    // Right vector for strafing.
    // moveDir = forward * move.y + right * move.x, where right = forward x up.
    tmp.moveDir.set(0, 0, 0);
    tmp.moveDir.addScaledVector(tmp.forward, inp.move.y);
    // right-hand: right = up x forward keeps strafe consistent with screen.
    tmp.east.crossVectors(tmp.up, tmp.forward).normalize();
    tmp.moveDir.addScaledVector(tmp.east, inp.move.x);
    if (tmp.moveDir.lengthSq() > 1e-6) tmp.moveDir.normalize();
    tmp.impulseDir.set(0, 0, 0);
    tmp.impulseDir.addScaledVector(tmp.forward, inp.impulse.y);
    tmp.impulseDir.addScaledVector(tmp.east, inp.impulse.x);
    if (tmp.impulseDir.lengthSq() > 1e-6) tmp.impulseDir.normalize();

    // --- Velocity integration ---
    // Decompose current velocity into up (vertical) and horizontal components.
    const vUpScalar = sim.velocity.dot(tmp.up);
    tmp.vUp.copy(tmp.up).multiplyScalar(vUpScalar);

    // Horizontal velocity is set directly from input (snappy, arcade feel).
    tmp.vHoriz.copy(tmp.moveDir).multiplyScalar(moveSpeed);

    // Apply gravity to the vertical component.
    let newVUp = vUpScalar - config.gravity * delta;

    // Jump on rising edge while grounded.
    const jumpPressed = inp.jump && !sim.wasJumpDown;
    sim.wasJumpDown = inp.jump;
    if (jumpPressed && sim.grounded) {
      newVUp = jumpSpeed;
      sim.grounded = false;
    }

    // Recompose velocity.
    sim.velocity.copy(tmp.vHoriz).addScaledVector(tmp.up, newVUp);

    // Step position.
    sim.position.addScaledVector(sim.velocity, delta);
    // Touch/mouse taps are spatial steps, not sub-frame velocity pulses. This is
    // consumed once by useWorldInput, so a throttled mobile renderer still moves.
    sim.position.addScaledVector(tmp.impulseDir, 0.9);

    // --- Collision resolution ---
    let grounded = false;

    if (collider && collider.geometry.boundsTree) {
      const bvh = collider.geometry.boundsTree;

      // Capsule segment: from foot to head along `up`.
      // We treat sim.position as the capsule CENTER. Segment spans the cylinder
      // part of the capsule (length = playerHeight), spheres of `radius` at ends.
      const half = config.playerHeight * 0.5;
      tmp.segment.start.copy(sim.position).addScaledVector(tmp.up, -half);
      tmp.segment.end.copy(sim.position).addScaledVector(tmp.up, half);

      tmp.totalPush.set(0, 0, 0);

      // Collider is at origin with identity transform => segment is already in
      // collider-local space; no matrix transforms needed.
      const recomputeBox = () => {
        tmp.capsuleBox.makeEmpty();
        tmp.capsuleBox.expandByPoint(tmp.segment.start);
        tmp.capsuleBox.expandByPoint(tmp.segment.end);
        tmp.capsuleBox.expandByScalar(radius);
      };
      recomputeBox();

      bvh.shapecast({
        intersectsBounds: (box) => box.intersectsBox(tmp.capsuleBox),
        intersectsTriangle: (tri) => {
          const dist = tri.closestPointToSegment(
            tmp.segment,
            tmp.triPoint,
            tmp.capsulePoint,
          );
          if (dist < radius) {
            const depth = radius - dist;
            tmp.pushDir.copy(tmp.capsulePoint).sub(tmp.triPoint);
            if (tmp.pushDir.lengthSq() < 1e-12) {
              // Degenerate (point inside triangle plane): push along up.
              tmp.pushDir.copy(tmp.up);
            } else {
              tmp.pushDir.normalize();
            }
            tmp.segment.start.addScaledVector(tmp.pushDir, depth);
            tmp.segment.end.addScaledVector(tmp.pushDir, depth);
            tmp.totalPush.addScaledVector(tmp.pushDir, depth);
          }
          return false;
        },
      });

      // New center = midpoint of resolved segment.
      sim.position.copy(tmp.segment.start).add(tmp.segment.end).multiplyScalar(0.5);

      // Grounded if the net push had an outward (along up) component.
      const upPush = tmp.totalPush.dot(tmp.up);
      if (upPush > 1e-4) {
        grounded = true;
        // Zero out inward (negative-up) velocity so we don't accumulate.
        const vUpNow = sim.velocity.dot(tmp.up);
        if (vUpNow < 0) {
          sim.velocity.addScaledVector(tmp.up, -vUpNow);
        }
      }
    } else {
      // No collider: treat the planet as a perfect sphere of planetRadius.
      // Keep the capsule center at radius + half-height above the surface.
      const surfaceDist = config.planetRadius + config.playerHeight * 0.5;
      const dist = sim.position.length();
      if (dist < surfaceDist) {
        sim.position.copy(tmp.up).multiplyScalar(surfaceDist);
        grounded = true;
        const vUpNow = sim.velocity.dot(tmp.up);
        if (vUpNow < 0) sim.velocity.addScaledVector(tmp.up, -vUpNow);
      }
    }

    sim.grounded = grounded;

    // Recompute up after collision (position moved).
    tmp.up.copy(sim.position);
    if (tmp.up.lengthSq() < 1e-8) tmp.up.set(0, 1, 0);
    tmp.up.normalize();

    // Re-project forward onto the (possibly shifted) tangent plane.
    tmp.forward.addScaledVector(tmp.up, -tmp.forward.dot(tmp.up));
    if (tmp.forward.lengthSq() < 1e-6) {
      // Fallback if forward collapsed: derive from north.
      const ref2 =
        Math.abs(tmp.up.dot(tmp.worldUpRef)) > 0.99 ? tmp.altUpRef : tmp.worldUpRef;
      tmp.east.crossVectors(ref2, tmp.up).normalize();
      tmp.forward.crossVectors(tmp.up, tmp.east).normalize();
    } else {
      tmp.forward.normalize();
    }

    // --- Orientation: local +Y -> up, local -Z -> forward ---
    tmp.zAxis.copy(tmp.forward).multiplyScalar(-1); // local +Z faces away from forward
    tmp.xAxis.crossVectors(tmp.up, tmp.zAxis).normalize();
    // Re-derive a clean z to guarantee orthonormality.
    tmp.zAxis.crossVectors(tmp.xAxis, tmp.up).normalize();
    tmp.basis.makeBasis(tmp.xAxis, tmp.up, tmp.zAxis);

    // --- Write transform to the rendered group (foot of the capsule) ---
    const g = groupRef.current;
    if (g) {
      // Foot = center - up * (half + radius). Children stand at group origin.
      const foot = config.playerHeight * 0.5 + radius;
      tmp.footPos.copy(sim.position).addScaledVector(tmp.up, -foot);
      g.position.copy(tmp.footPos);
      g.quaternion.setFromRotationMatrix(tmp.basis);
    }

    // --- Publish state (reused object) ---
    if (onState) {
      outState.position.copy(sim.position);
      outState.quaternion.setFromRotationMatrix(tmp.basis);
      outState.up.copy(tmp.up);
      outState.forward.copy(tmp.forward);
      outState.grounded = grounded;
      outState.speed = tmp.vHoriz.length();
      outState.motion = grounded ? (outState.speed > 0.05 ? "walk" : "idle") : "airborne";
      onState(outState);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
