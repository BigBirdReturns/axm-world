// Embodied arc representation: the player walks between authored locations on
// the generated world. Shell chrome still owns contracts, encounters and records.

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { DEFAULT_WORLD_CONFIG, type Vec3, type WorldNode } from "./contract.js";
import { generatePlanet, makeColliderBVH } from "./planet/generatePlanet.js";
import { scatterOnPlanet } from "./planet/scatter.js";
import { Scatter } from "./planet/ScatterLayer.js";
import { NodeMarkers } from "./components/NodeMarkers.js";
import type { ArcInteraction } from "./useArcInteraction.js";
import type { ArcWorld } from "./useArcWorld.js";
import { PlanetController, type ControllerState } from "./core/PlanetController.js";
import { FollowCamera } from "./core/FollowCamera.js";
import { PlayerCharacter } from "./core/PlayerCharacter.js";
import { setVirtualWorldInput } from "./core/input.js";
import { isWorldNodeWithinRange, nearestWorldNode } from "./proximity.js";
import { t } from "./i18n/index.js";
import "./world-screen.css";

const RADIUS = DEFAULT_WORLD_CONFIG.planetRadius;
const SEED = 7;
// Includes the controller capsule height: if the avatar is visibly standing at
// a marker, the interaction must agree instead of measuring only center->ground.
const INTERACTION_RADIUS = 3;
const INTERACTION_EXIT_RADIUS = 4;
const TAP_MOVE_MS = 500;

export interface SceneProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  modalOpen?: boolean;
  active?: boolean;
}

/** Drop each node onto the actual displaced terrain (so markers do not float). */
function placeOnTerrain(nodes: WorldNode[], collider: THREE.Mesh | null): WorldNode[] {
  if (!collider) return nodes;
  const ray = new THREE.Raycaster();
  const from = new THREE.Vector3();
  const dir = new THREE.Vector3();
  return nodes.map((node) => {
    from.set(...node.normal).multiplyScalar(RADIUS * 1.8);
    dir.set(...node.normal).multiplyScalar(-1).normalize();
    ray.set(from, dir);
    const hit = ray.intersectObject(collider, false)[0];
    return hit ? { ...node, position: [hit.point.x, hit.point.y, hit.point.z] } : node;
  });
}

function placeSpawn(normal: Vec3, collider: THREE.Mesh | null): Vec3 {
  const direction = new THREE.Vector3(...normal).normalize();
  const surface = direction.clone().multiplyScalar(RADIUS);
  if (collider) {
    const ray = new THREE.Raycaster(direction.clone().multiplyScalar(RADIUS * 1.8), direction.clone().negate());
    const hit = ray.intersectObject(collider, false)[0];
    if (hit) surface.copy(hit.point);
  }
  const capsuleOffset = DEFAULT_WORLD_CONFIG.playerHeight * 0.5 + DEFAULT_WORLD_CONFIG.playerRadius + 0.08;
  surface.addScaledVector(direction, capsuleOffset);
  return [surface.x, surface.y, surface.z];
}

function captureControlPointer(event: ReactPointerEvent<HTMLButtonElement>): void {
  event.stopPropagation();
  event.currentTarget.setPointerCapture(event.pointerId);
}

/** A tap must move on mobile; pointer-down/up can otherwise occur between two
 * frames and produce no visible step. Holding still uses the continuous input
 * path, while click adds one small deterministic nudge. */
function tapMovement(input: { x?: number; y?: number; jump?: boolean }): void {
  if (!input.jump) {
    setVirtualWorldInput({ ...input, impulse: true });
    return;
  }
  setVirtualWorldInput(input);
  window.setTimeout(() => setVirtualWorldInput({ x: 0, y: 0, jump: false }), TAP_MOVE_MS);
}

function scheduleTapMovement(input: { x?: number; y?: number; jump?: boolean }): void {
  window.setTimeout(() => tapMovement(input), 0);
}

export function PlanetScene({ world, interaction: ix, modalOpen = false, active = true }: SceneProps): JSX.Element {
  const [collider, setCollider] = useState<THREE.Mesh | null>(null);
  const [nearbyChallengeId, setNearbyChallengeId] = useState<string | null>(null);
  const controllerState = useRef<ControllerState | null>(null);
  const nearbyId = useRef<string | null>(null);

  const geometry = useMemo(() => {
    const generated = generatePlanet({ radius: RADIUS, seed: SEED });
    makeColliderBVH(generated);
    return generated;
  }, []);
  const scatterItems = useMemo(() => scatterOnPlanet(geometry, RADIUS, 140, SEED), [geometry]);
  const placedNodes = useMemo(() => placeOnTerrain(world.nodes, collider), [world.nodes, collider]);
  const spawn = useMemo(() => placeSpawn(world.layout.spawn.normal, collider), [world.layout.spawn.normal, collider]);

  const setColliderRef = useCallback((mesh: THREE.Mesh | null) => {
    if (mesh) setCollider((previous) => previous ?? mesh);
  }, []);

  const onControllerState = useCallback((state: ControllerState) => {
    controllerState.current = state;
    const position: Vec3 = [state.position.x, state.position.y, state.position.z];
    const retained = nearbyId.current ? placedNodes.find((node) => node.challengeId === nearbyId.current) ?? null : null;
    const nearby = retained && isWorldNodeWithinRange(position, retained, INTERACTION_EXIT_RADIUS)
      ? retained
      : nearestWorldNode(position, placedNodes, INTERACTION_RADIUS);
    if (nearby?.challengeId === nearbyId.current) return;
    const nextId = nearby?.challengeId ?? null;
    nearbyId.current = nextId;
    setNearbyChallengeId(nextId);
    ix.setNearbyId(nextId);
    if (nearby) {
      // Arrival consumes virtual movement so a tap/hold cannot carry the player
      // straight through the interaction radius while the encounter opens.
      setVirtualWorldInput({ x: 0, y: 0, jump: false });
      ix.select(nearby.challengeId);
    }
  }, [ix.select, ix.setNearbyId, placedNodes]);

  // Leaving the World renderer revokes physical access. Shared selection may
  // remain useful on Board/Map, but it cannot leak back as proximity authority.
  useEffect(() => () => ix.setNearbyId(null), [ix.setNearbyId]);

  const releaseMovement = useCallback(() => setVirtualWorldInput({ x: 0, y: 0 }), []);

  return (
    <div className="walkable-world" data-testid="walkable-world">
      <Canvas style={{ position: "absolute", inset: 0, pointerEvents: modalOpen ? "none" : "auto" }} frameloop={active ? "always" : "never"} camera={{ position: [0, RADIUS * 0.7, RADIUS * 2.6], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={["#0b0a08"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[25, 18, 12]} intensity={1.2} />
        <Stars radius={120} depth={40} count={1400} factor={4} fade speed={0.4} />

        <mesh ref={setColliderRef} geometry={geometry}>
          <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
        </mesh>
        <Scatter items={scatterItems} />
        <NodeMarkers nodes={placedNodes} selectedId={ix.selectedId} labelsEnabled={!modalOpen} occluder={collider} selectedRisk={ix.readiness?.projectedOutcome ?? "none"} changedId={world.lastReport?.challengeId} />
        <PlanetController collider={collider} config={DEFAULT_WORLD_CONFIG} initialPosition={spawn} onState={onControllerState}>
          <PlayerCharacter />
        </PlanetController>
        <FollowCamera getState={() => controllerState.current} />
      </Canvas>

      {!modalOpen && (
        <div className={`world-proximity-status${nearbyChallengeId ? " world-proximity-status--unlocked" : ""}`} data-testid="world-proximity-status" data-unlocked={nearbyChallengeId ? "true" : "false"}>
          {nearbyChallengeId
            ? `${placedNodes.find((node) => node.challengeId === nearbyChallengeId)?.title ?? nearbyChallengeId} · ${t("world.interactionUnlocked")}`
            : t("world.walkToInteract")}
        </div>
      )}

      {!modalOpen && (
        <div className="world-movement-pad" data-testid="world-movement-pad" aria-label={t("world.movementControls")}>
          <button type="button" className="world-move-forward" aria-label={t("world.walkForward")} onPointerDown={(event) => { captureControlPointer(event); setVirtualWorldInput({ y: 1 }); }} onPointerUp={(event) => { event.stopPropagation(); releaseMovement(); }} onPointerCancel={releaseMovement} onClick={() => scheduleTapMovement({ y: 1 })}>W</button>
          <button type="button" aria-label={t("world.strafeLeft")} onPointerDown={(event) => { captureControlPointer(event); setVirtualWorldInput({ x: -1 }); }} onPointerUp={(event) => { event.stopPropagation(); releaseMovement(); }} onPointerCancel={releaseMovement} onClick={() => scheduleTapMovement({ x: -1 })}>A</button>
          <button type="button" aria-label={t("world.walkBackward")} onPointerDown={(event) => { captureControlPointer(event); setVirtualWorldInput({ y: -1 }); }} onPointerUp={(event) => { event.stopPropagation(); releaseMovement(); }} onPointerCancel={releaseMovement} onClick={() => scheduleTapMovement({ y: -1 })}>S</button>
          <button type="button" aria-label={t("world.strafeRight")} onPointerDown={(event) => { captureControlPointer(event); setVirtualWorldInput({ x: 1 }); }} onPointerUp={(event) => { event.stopPropagation(); releaseMovement(); }} onPointerCancel={releaseMovement} onClick={() => scheduleTapMovement({ x: 1 })}>D</button>
          <button type="button" className="world-jump" aria-label={t("world.jump")} onPointerDown={(event) => { captureControlPointer(event); setVirtualWorldInput({ jump: true }); }} onPointerUp={(event) => { event.stopPropagation(); setVirtualWorldInput({ jump: false }); }} onPointerCancel={() => setVirtualWorldInput({ jump: false })} onClick={() => scheduleTapMovement({ jump: true })}>JUMP</button>
        </div>
      )}
    </div>
  );
}
