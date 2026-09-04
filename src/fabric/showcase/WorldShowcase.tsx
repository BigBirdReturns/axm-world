import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { InfiniteFabricWorld } from "../contracts.js";

const RADIUS = 22;

export interface WorldShowcaseProps {
  world: InfiniteFabricWorld;
  moment: "root" | "star" | "village" | "rain";
  intensity?: number;
}

function normalizedPosition(value: readonly number[], altitude = 0.7): THREE.Vector3 {
  const vector = new THREE.Vector3(value[0] ?? 0, value[1] ?? 1, value[2] ?? 0);
  if (vector.lengthSq() < 0.0001) vector.set(0, 1, 0);
  return vector.normalize().multiplyScalar(RADIUS + altitude);
}

function SurfaceAnchor({ position, children }: { position: THREE.Vector3; children: React.ReactNode }): JSX.Element {
  const rotation = useMemo(() => new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    position.clone().normalize(),
  ), [position]);
  return <group position={position} quaternion={rotation}>{children}</group>;
}

interface OrbitCameraProps extends Pick<WorldShowcaseProps, "moment"> {
  focus: THREE.Vector3;
}

function OrbitCamera({ moment, focus }: OrbitCameraProps): null {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const normal = useRef(new THREE.Vector3());
  const tangent = useRef(new THREE.Vector3());
  const bitangent = useRef(new THREE.Vector3());
  const worldUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const worldForward = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    if (moment === "village" || moment === "rain") {
      normal.current.copy(focus).normalize();
      const reference = Math.abs(normal.current.dot(worldUp)) > 0.92 ? worldForward : worldUp;
      tangent.current.crossVectors(reference, normal.current).normalize();
      bitangent.current.crossVectors(normal.current, tangent.current).normalize();
      desired.current
        .copy(focus)
        .addScaledVector(normal.current, moment === "rain" ? 14.8 : 13.4)
        .addScaledVector(tangent.current, 10.8)
        .addScaledVector(bitangent.current, 3.8 + Math.sin(time * 0.22) * 1.1);
      camera.position.lerp(desired.current, 1 - Math.exp(-delta * 3.4));
      target.current.lerp(
        focus.clone().addScaledVector(normal.current, 1.25),
        1 - Math.exp(-delta * 5.2),
      );
      camera.up.lerp(normal.current, 1 - Math.exp(-delta * 5.4)).normalize();
      camera.lookAt(target.current);
      return;
    }

    const speed = moment === "root" ? 0.17 : 0.11;
    const radius = 48;
    desired.current.set(
      Math.cos(time * speed) * radius,
      15 + Math.sin(time * 0.13) * 4,
      Math.sin(time * speed) * radius,
    );
    camera.position.lerp(desired.current, 1 - Math.exp(-delta * 2.8));
    target.current.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.exp(-delta * 4));
    camera.up.lerp(worldUp, 1 - Math.exp(-delta * 4.6)).normalize();
    camera.lookAt(target.current);
  });
  return null;
}

function PlanetDecor(): JSX.Element {
  const objects = useMemo(() => {
    let seed = 0x51f15e;
    const random = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    return Array.from({ length: 96 }, (_, index) => {
      const theta = random() * Math.PI * 2;
      const y = random() * 1.82 - 0.91;
      const radial = Math.sqrt(1 - y * y);
      const normalValue = new THREE.Vector3(
        Math.cos(theta) * radial,
        y,
        Math.sin(theta) * radial,
      );
      return {
        id: index,
        position: normalValue.multiplyScalar(RADIUS + 0.25),
        size: 0.45 + random() * 1.4,
        tree: random() > 0.48,
      };
    });
  }, []);

  return (
    <>
      {objects.map((object) => (
        <SurfaceAnchor key={object.id} position={object.position}>
          {object.tree ? (
            <group>
              <mesh position={[0, object.size * 0.42, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.18, object.size * 0.84, 5]} />
                <meshStandardMaterial color="#503927" roughness={1} />
              </mesh>
              <mesh position={[0, object.size * 1.05, 0]} castShadow>
                <dodecahedronGeometry args={[0.34 + object.size * 0.22, 0]} />
                <meshStandardMaterial color={object.id % 3 === 0 ? "#78a55b" : "#5f8b4e"} roughness={0.95} flatShading />
              </mesh>
            </group>
          ) : (
            <mesh position={[0, object.size * 0.16, 0]} castShadow>
              <dodecahedronGeometry args={[0.22 + object.size * 0.12, 0]} />
              <meshStandardMaterial color="#8d8877" roughness={1} flatShading />
            </mesh>
          )}
        </SurfaceAnchor>
      ))}
    </>
  );
}

function Village({ position }: { position: THREE.Vector3 }): JSX.Element {
  const houses = [
    [-2.1, 0, -1.4],
    [0, 0, -2.2],
    [2.1, 0, -1.1],
    [-1.45, 0, 1.25],
    [1.45, 0, 1.5],
  ] as const;
  return (
    <SurfaceAnchor position={position}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[4.25, 4.25, 0.16, 14]} />
        <meshStandardMaterial color="#baa37a" roughness={1} />
      </mesh>
      {houses.map((house, index) => (
        <group key={index} position={house}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[1.4, 1.4, 1.35]} />
            <meshStandardMaterial color={index % 2 === 0 ? "#d79a6b" : "#d5b17c"} roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.72, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1.12, 0.95, 4]} />
            <meshStandardMaterial color="#66443f" roughness={0.95} />
          </mesh>
        </group>
      ))}
      <group position={[0, 0.72, 2.5]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 1.44, 0.62]} />
          <meshStandardMaterial color="#7865ae" roughness={0.75} />
        </mesh>
        <mesh position={[0, 1.14, 0]} castShadow>
          <sphereGeometry args={[0.43, 12, 8]} />
          <meshStandardMaterial color="#d5a57e" roughness={0.88} />
        </mesh>
      </group>
      <mesh position={[0, 2.6, 2.5]}>
        <torusGeometry args={[0.42, 0.08, 8, 24]} />
        <meshStandardMaterial color="#f0c56b" emissive="#7d4b13" emissiveIntensity={1.2} />
      </mesh>
    </SurfaceAnchor>
  );
}

function Storm({ active }: { active: boolean }): JSX.Element {
  const cloud = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!cloud.current) return;
    cloud.current.rotation.y = clock.elapsedTime * 0.09;
    cloud.current.rotation.z = Math.sin(clock.elapsedTime * 0.22) * 0.08;
  });
  return (
    <group ref={cloud} visible={active}>
      <mesh scale={1.24}>
        <icosahedronGeometry args={[RADIUS, 3]} />
        <meshBasicMaterial color="#6c78b4" transparent opacity={0.09} wireframe />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[31, 0.18, 8, 128]} />
        <meshBasicMaterial color="#8fb0ff" transparent opacity={0.38} />
      </mesh>
    </group>
  );
}

function RevisionOrbit({ count }: { count: number }): JSX.Element {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.elapsedTime * 0.08;
  });
  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, index) => (
        <mesh key={index} rotation={[Math.PI / 2 + index * 0.35, index * 0.65, 0]}>
          <torusGeometry args={[RADIUS + 4.8 + index * 1.6, 0.045, 6, 96]} />
          <meshBasicMaterial color={index % 2 === 0 ? "#e6c46a" : "#75b6d8"} transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ world, moment, intensity = 1 }: WorldShowcaseProps): JSX.Element {
  const villageCell = world.cells.find((cell) => cell.id === "cell:village:north");
  const villagePosition = useMemo(
    () => villageCell
      ? normalizedPosition(villageCell.space.anchor, 0.5)
      : normalizedPosition([0.52, 0.81, 0.27], 0.5),
    [villageCell],
  );
  const hasVillage = moment === "village" || moment === "rain";
  const hasStar = moment !== "root";
  const rain = moment === "rain";

  return (
    <>
      <OrbitCamera moment={moment} focus={villagePosition} />
      <color attach="background" args={["#03050b"]} />
      <fog attach="fog" args={["#060812", 62, 145]} />
      <ambientLight intensity={0.72 * intensity} />
      <directionalLight position={[38, 48, 28]} intensity={2.3 * intensity} castShadow />
      <pointLight position={[-28, -12, -22]} intensity={1.7} color="#4b74c9" />
      <pointLight position={[12, 30, -8]} intensity={1.2} color="#f0c168" />
      <Stars radius={170} depth={95} count={3200} factor={3.2} saturation={0.35} fade speed={0.2} />

      <group>
        <mesh receiveShadow castShadow>
          <icosahedronGeometry args={[RADIUS, 5]} />
          <meshStandardMaterial color={rain ? "#496f4a" : "#608e54"} roughness={0.93} metalness={0.02} flatShading />
        </mesh>
        <mesh scale={1.035}>
          <icosahedronGeometry args={[RADIUS, 4]} />
          <meshBasicMaterial color="#6db7e3" transparent opacity={0.11} side={THREE.BackSide} />
        </mesh>
        <PlanetDecor />
        <RevisionOrbit count={Math.max(1, Math.min(3, world.ledger.events.length + 1))} />
        <Storm active={rain} />

        {hasStar && (
          <SurfaceAnchor position={normalizedPosition([0.16, 0.98, 0.1], 1.1)}>
            <mesh position={[0, 1.45, 0]}>
              <octahedronGeometry args={[0.9, 0]} />
              <meshStandardMaterial color="#ffd86b" emissive="#b66d12" emissiveIntensity={1.5} roughness={0.28} />
            </mesh>
          </SurfaceAnchor>
        )}

        {hasVillage && <Village position={villagePosition} />}
      </group>
    </>
  );
}

export function WorldShowcase(props: WorldShowcaseProps): JSX.Element {
  return (
    <Canvas
      camera={{ position: [0, 16, 48], fov: 46, near: 0.1, far: 320 }}
      dpr={[1, 1.7]}
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
