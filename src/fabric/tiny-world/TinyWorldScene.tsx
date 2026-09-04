import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { InfiniteFabricWorld } from "../contracts.js";

const PLANET_RADIUS = 24;
const PLAYER_ALTITUDE = 0.9;
const INTERACTION_RADIUS = 5.5;

interface TinyWorldSceneProps {
  world: InfiniteFabricWorld;
  interactive: boolean;
  onInteract(entityId: string): void;
  onNearby(entityId: string | null): void;
}

function surfacePosition(value: readonly number[], altitude = 0.8): THREE.Vector3 {
  const position = new THREE.Vector3(value[0] ?? 0, value[1] ?? 1, value[2] ?? 0);
  if (position.lengthSq() < 0.0001) position.set(0, 1, 0);
  return position.normalize().multiplyScalar(PLANET_RADIUS + altitude);
}

function surfaceQuaternion(position: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    position.clone().normalize(),
  );
}

interface SurfaceGroupProps {
  position: THREE.Vector3;
  children: React.ReactNode;
}

function SurfaceGroup({ position, children }: SurfaceGroupProps): JSX.Element {
  const quaternion = useMemo(() => surfaceQuaternion(position), [position]);
  return (
    <group position={position} quaternion={quaternion}>
      {children}
    </group>
  );
}

function DecorativeWorld(): JSX.Element {
  const decorations = useMemo(() => {
    let state = 0x51f15e;
    const random = (): number => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };
    return Array.from({ length: 72 }, (_, index) => {
      const theta = random() * Math.PI * 2;
      const y = random() * 1.8 - 0.9;
      const radial = Math.sqrt(1 - y * y);
      const normal = new THREE.Vector3(
        Math.cos(theta) * radial,
        y,
        Math.sin(theta) * radial,
      );
      return {
        id: `decoration:${index}`,
        position: normal.multiplyScalar(PLANET_RADIUS + 0.45),
        height: 0.8 + random() * 2.6,
        kind: random() > 0.58 ? "tree" : "stone",
      };
    });
  }, []);

  return (
    <>
      {decorations.map((decoration) => (
        <SurfaceGroup key={decoration.id} position={decoration.position}>
          {decoration.kind === "tree" ? (
            <group>
              <mesh position={[0, decoration.height * 0.34, 0]} castShadow>
                <boxGeometry args={[0.32, decoration.height * 0.68, 0.32]} />
                <meshStandardMaterial color="#5f422c" roughness={0.95} />
              </mesh>
              <mesh position={[0, decoration.height * 0.82, 0]} castShadow>
                <dodecahedronGeometry args={[0.7 + decoration.height * 0.11, 0]} />
                <meshStandardMaterial color="#5f8f52" roughness={0.9} flatShading />
              </mesh>
            </group>
          ) : (
            <mesh position={[0, decoration.height * 0.18, 0]} castShadow>
              <dodecahedronGeometry args={[0.3 + decoration.height * 0.12, 0]} />
              <meshStandardMaterial color="#8d8776" roughness={1} flatShading />
            </mesh>
          )}
        </SurfaceGroup>
      ))}
    </>
  );
}

function VillageVisual(): JSX.Element {
  const houses = [
    [-1.8, 0, -1.2],
    [0, 0, -1.8],
    [1.8, 0, -0.9],
    [-1.1, 0, 1.2],
    [1.1, 0, 1.3],
  ] as const;
  return (
    <group>
      {houses.map((position, index) => (
        <group key={index} position={position}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[1.25, 1.1, 1.25]} />
            <meshStandardMaterial color={index % 2 === 0 ? "#d0a36d" : "#c77e64"} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1.05, 0.9, 4]} />
            <meshStandardMaterial color="#6f4d44" roughness={0.95} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[3.2, 3.2, 0.14, 12]} />
        <meshStandardMaterial color="#af9b73" roughness={1} />
      </mesh>
    </group>
  );
}

interface EntityVisualProps {
  entity: InfiniteFabricWorld["cells"][number]["entities"][number];
}

function EntityVisual({ entity }: EntityVisualProps): JSX.Element | null {
  if (entity.id === "entity:planet:root") return null;
  if (entity.schemaRef === "schema:collectible" && entity.state.collected === true) return null;
  const position = surfacePosition(entity.transform.position);

  return (
    <SurfaceGroup position={position}>
      {entity.id === "entity:village:north" ? (
        <VillageVisual />
      ) : entity.schemaRef === "schema:collectible" ? (
        <mesh position={[0, 1.4, 0]} castShadow>
          <octahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color="#ffd76a" emissive="#8f5b12" emissiveIntensity={1.2} roughness={0.35} />
        </mesh>
      ) : entity.schemaRef === "schema:npc" ? (
        <group>
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[0.85, 1.5, 0.65]} />
            <meshStandardMaterial color={entity.id.includes("shopkeeper") ? "#7e6bb3" : "#4d7995"} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <sphereGeometry args={[0.48, 12, 8]} />
            <meshStandardMaterial color="#d5a77f" roughness={0.9} />
          </mesh>
          {entity.state.engaged === true && (
            <mesh position={[0, 2.6, 0]}>
              <sphereGeometry args={[0.18, 8, 6]} />
              <meshBasicMaterial color="#9ff3a8" />
            </mesh>
          )}
        </group>
      ) : entity.schemaRef === "schema:quest" ? (
        <group position={[0, 1.2, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.68, 0.12, 8, 20]} />
            <meshStandardMaterial color={entity.state.status === "resolved" ? "#8ee39b" : "#e1a55c"} emissive="#5a3011" emissiveIntensity={0.55} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#f5e1a4" />
          </mesh>
        </group>
      ) : entity.schemaRef === "schema:interactable" ? (
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[1.25, 1.4, 1.25]} />
          <meshStandardMaterial color={entity.state.active === true ? "#68bb81" : "#b87647"} roughness={0.75} />
        </mesh>
      ) : entity.schemaRef === "schema:hazard" ? (
        <mesh position={[0, 3.2, 0]}>
          <icosahedronGeometry args={[1.8, 1]} />
          <meshStandardMaterial
            color={entity.state.active === true ? "#6a739f" : "#4a5065"}
            emissive={entity.state.active === true ? "#343c72" : "#000000"}
            emissiveIntensity={0.8}
            transparent
            opacity={entity.state.active === true ? 0.72 : 0.28}
            wireframe
          />
        </mesh>
      ) : entity.schemaRef === "schema:portal" ? (
        <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.1, 0.18, 12, 28]} />
          <meshStandardMaterial color="#6fc0d3" emissive="#174a5d" emissiveIntensity={1} />
        </mesh>
      ) : entity.schemaRef === "schema:chaser" ? (
        <mesh position={[0, 0.8, 0]} castShadow>
          <coneGeometry args={[0.75, 1.6, 6]} />
          <meshStandardMaterial color="#a95555" roughness={0.8} />
        </mesh>
      ) : (
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[1, 0.9, 1]} />
          <meshStandardMaterial color="#9f9275" roughness={0.9} />
        </mesh>
      )}
    </SurfaceGroup>
  );
}

function PlayerController({ world, interactive, onInteract, onNearby }: TinyWorldSceneProps): JSX.Element {
  const group = useRef<THREE.Group>(null);
  const keys = useRef(new Set<string>());
  const up = useRef(new THREE.Vector3(0.12, 0.987, 0.1).normalize());
  const lastForward = useRef(new THREE.Vector3(0, 0, -1));
  const primaryHeld = useRef(false);
  const lastNearby = useRef<string | null>(null);
  const { camera } = useThree();

  const targets = useMemo(() => world.cells.flatMap((cell) =>
    cell.entities
      .filter((entity) => entity.id !== "entity:planet:root")
      .filter((entity) => !(entity.schemaRef === "schema:collectible" && entity.state.collected === true))
      .map((entity) => ({ entity, position: surfacePosition(entity.transform.position) }))), [world]);

  useEffect(() => {
    const recognized = new Set([
      "KeyW", "KeyA", "KeyS", "KeyD",
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Space", "Enter", "KeyE",
    ]);
    const down = (event: KeyboardEvent): void => {
      if (!recognized.has(event.code)) return;
      event.preventDefault();
      keys.current.add(event.code);
    };
    const release = (event: KeyboardEvent): void => {
      keys.current.delete(event.code);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", release);
    };
  }, []);

  useFrame((_, delta) => {
    const keyboardX = (keys.current.has("KeyD") || keys.current.has("ArrowRight") ? 1 : 0)
      - (keys.current.has("KeyA") || keys.current.has("ArrowLeft") ? 1 : 0);
    const keyboardY = (keys.current.has("KeyW") || keys.current.has("ArrowUp") ? 1 : 0)
      - (keys.current.has("KeyS") || keys.current.has("ArrowDown") ? 1 : 0);
    const pad = typeof navigator !== "undefined" && navigator.getGamepads
      ? navigator.getGamepads()[0]
      : null;
    const gamepadX = Math.abs(pad?.axes[0] ?? 0) > 0.16 ? pad?.axes[0] ?? 0 : 0;
    const gamepadY = Math.abs(pad?.axes[1] ?? 0) > 0.16 ? -(pad?.axes[1] ?? 0) : 0;
    const axisX = THREE.MathUtils.clamp(keyboardX + gamepadX, -1, 1);
    const axisY = THREE.MathUtils.clamp(keyboardY + gamepadY, -1, 1);

    const normal = up.current;
    const north = new THREE.Vector3(0, 1, 0).projectOnPlane(normal);
    if (north.lengthSq() < 0.0001) north.set(0, 0, -1).projectOnPlane(normal);
    north.normalize();
    const east = new THREE.Vector3().crossVectors(north, normal).normalize();
    const movement = east.multiplyScalar(axisX).add(north.multiplyScalar(axisY));

    if (interactive && movement.lengthSq() > 0.001) {
      movement.normalize();
      normal.addScaledVector(movement, delta * 0.42).normalize();
      lastForward.current.lerp(movement, 1 - Math.exp(-delta * 10)).normalize();
    }

    const playerPosition = normal.clone().multiplyScalar(PLANET_RADIUS + PLAYER_ALTITUDE);
    if (group.current) {
      group.current.position.copy(playerPosition);
      group.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    }

    const desiredCamera = playerPosition.clone()
      .addScaledVector(normal, 5.8)
      .addScaledVector(lastForward.current, -8.2);
    camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 5.5));
    camera.up.lerp(normal, 1 - Math.exp(-delta * 8)).normalize();
    camera.lookAt(playerPosition.clone().addScaledVector(normal, 0.7));

    let nearest: { entityId: string; distance: number } | null = null;
    for (const target of targets) {
      const distance = playerPosition.distanceTo(target.position);
      if (distance <= INTERACTION_RADIUS && (!nearest || distance < nearest.distance)) {
        nearest = { entityId: target.entity.id, distance };
      }
    }
    const nearbyId = nearest?.entityId ?? null;
    if (nearbyId !== lastNearby.current) {
      lastNearby.current = nearbyId;
      onNearby(nearbyId);
    }

    const keyboardPrimary = keys.current.has("Space") || keys.current.has("Enter") || keys.current.has("KeyE");
    const primary = keyboardPrimary || (pad?.buttons[0]?.pressed ?? false);
    if (interactive && primary && !primaryHeld.current && nearbyId) onInteract(nearbyId);
    primaryHeld.current = primary;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.85, 1.8, 0.7]} />
        <meshStandardMaterial color="#d8c16f" roughness={0.72} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <sphereGeometry args={[0.5, 12, 8]} />
        <meshStandardMaterial color="#b98868" roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.15, -0.5]}>
        <boxGeometry args={[0.22, 0.22, 0.65]} />
        <meshBasicMaterial color="#fff3aa" />
      </mesh>
    </group>
  );
}

export function TinyWorldScene(props: TinyWorldSceneProps): JSX.Element {
  return (
    <Canvas
      camera={{ position: [0, 31, 35], fov: 54, near: 0.1, far: 500 }}
      shadows
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#04070e"]} />
      <fog attach="fog" args={["#080b15", 58, 145]} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[35, 48, 24]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-30, -10, -20]} intensity={1.2} color="#5c8fd8" />
      <Stars radius={160} depth={80} count={2400} factor={3} saturation={0.2} fade speed={0.15} />

      <mesh receiveShadow castShadow>
        <icosahedronGeometry args={[PLANET_RADIUS, 5]} />
        <meshStandardMaterial color="#628e53" roughness={0.94} metalness={0.02} flatShading />
      </mesh>
      <mesh scale={1.025}>
        <icosahedronGeometry args={[PLANET_RADIUS, 5]} />
        <meshBasicMaterial color="#68a5d8" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>

      <DecorativeWorld />
      {props.world.cells.flatMap((cell) => cell.entities.map((entity) => (
        <EntityVisual key={entity.id} entity={entity} />
      )))}
      <PlayerController {...props} />
    </Canvas>
  );
}
