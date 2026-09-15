import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import type { StrategyBoardDriverContract } from "../../engine/strategy-board/driver.js";
import type { StrategyBoardProgram } from "../../engine/strategy-board/program.js";
import type { StrategyBoardSession } from "./strategy-board-session.js";
import { strategyBoardEdges, strategyBoardLayout, type StrategyBoardPoint } from "./strategy-board-layout.js";

interface StrategyBoardSceneProps {
  program: StrategyBoardProgram;
  state: StrategyBoardSession["state"];
  driver: StrategyBoardDriverContract | null;
  legalMoves: ReadonlySet<string>;
  terminal: boolean;
  onMove: (spaceId: string) => void;
}

const worldPoint = (point: StrategyBoardPoint): [number, number, number] => [
  (point.y - 50) / 6.2,
  0,
  (point.x - 50) / 7.4,
];

function controlForDoctrine(driver: StrategyBoardDriverContract | null, doctrineId: string): "human" | "automatic" | "seat" {
  return driver?.doctrines.find((entry) => entry.doctrineId === doctrineId)?.control ?? "seat";
}

function Pawn({ position, control, label, offset }: {
  position: [number, number, number];
  control: "human" | "automatic" | "seat";
  label: string;
  offset: number;
}) {
  const color = control === "human" ? "#56e4d6" : control === "automatic" ? "#ff7c8f" : "#9bb2c0";
  return (
    <group position={[position[0] + offset, .62, position[2] + offset * .45]}>
      <mesh castShadow>
        <cylinderGeometry args={[.18, .28, .42, 12]} />
        <meshStandardMaterial color={color} roughness={.28} metalness={.2} />
      </mesh>
      <mesh position={[0, .32, 0]} castShadow>
        <sphereGeometry args={[.2, 16, 12]} />
        <meshStandardMaterial color={color} roughness={.22} />
      </mesh>
      <pointLight color={color} intensity={2.2} distance={2.5} />
      <Html center position={[0, .72, 0]} distanceFactor={11} style={{ pointerEvents: "none" }}>
        <div className="strategy-3d-token-label" data-control={control}>{control === "human" ? "YOU" : control === "automatic" ? "CPU" : label}</div>
      </Html>
    </group>
  );
}

export function StrategyBoardScene({ program, state, driver, legalMoves, terminal, onMove }: StrategyBoardSceneProps): JSX.Element {
  const def = program.definition;
  const points = strategyBoardLayout(program);
  const edges = strategyBoardEdges(program);
  const seats = new Map(state.seats.map((seat) => [seat.seatId, seat]));
  const pointFor = (id: string) => worldPoint(points.get(id) ?? { x: 50, y: 50 });

  return (
    <Canvas className="strategy-3d" dpr={[1, 1.5]} shadows camera={{ position: [0, 9.2, 9.8], fov: 44, near: .1, far: 70 }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
      <color attach="background" args={["#03101a"]} />
      <fog attach="fog" args={["#03101a", 10, 24]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[-5, 9, 4]} intensity={2.4} color="#bde7e5" castShadow />
      <directionalLight position={[7, 5, -6]} intensity={.45} color="#8ba6c7" />
      <Stars radius={40} depth={18} count={650} factor={2.2} saturation={.15} fade speed={.12} />
      <Sparkles count={90} scale={[13, 2.5, 8]} size={1.35} speed={.16} opacity={.2} color="#83d6dc" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.42, 0]} receiveShadow>
        <planeGeometry args={[26, 18, 1, 1]} />
        <meshStandardMaterial color="#062530" roughness={.8} metalness={.02} />
      </mesh>

      {edges.map(([from, to]) => (
        <Line
          key={`${from}:${to}`}
          points={[pointFor(from), pointFor(to)].map(([x, , z]) => [x, -.14, z] as [number, number, number])}
          color="#4f8795"
          lineWidth={1.25}
          transparent
          opacity={.52}
          dashed
          dashSize={.15}
          gapSize={.11}
        />
      ))}

      {def.spaces.map((space, index) => {
        const [x, , z] = pointFor(space.id);
        const asset = def.controlAssets.find((item) => item.sitedOnSpaceId === space.id);
        const owner = asset ? state.ownership[asset.id] : null;
        const ownerSeat = owner ? seats.get(owner) : undefined;
        const control = ownerSeat ? controlForDoctrine(driver, ownerSeat.doctrineId) : "seat";
        const reachable = !terminal && state.phase === "movementResolution" && legalMoves.has(space.id);
        const color = control === "human" ? "#177f79" : control === "automatic" ? "#7d3444" : index % 2 ? "#214a55" : "#285963";
        return (
          <group key={space.id} position={[x, 0, z]}>
            <mesh receiveShadow castShadow>
              <cylinderGeometry args={[1.0, 1.18, .32, 9]} />
              <meshStandardMaterial color={color} roughness={.68} metalness={.05} />
            </mesh>
            <mesh position={[0, .19, 0]}>
              <cylinderGeometry args={[.78, .94, .12, 9]} />
              <meshStandardMaterial color={reachable ? "#6fcfd0" : "#3d6870"} emissive={reachable ? "#1f7f82" : "#071317"} emissiveIntensity={reachable ? .9 : .15} roughness={.72} />
            </mesh>
            <group position={[0, .48, 0]} rotation={[0, index * .73, 0]}>
              <mesh castShadow>
                <octahedronGeometry args={[space.type === "start" ? .28 : .22, 0]} />
                <meshStandardMaterial color={reachable ? "#c4f5ed" : control === "automatic" ? "#e08b9b" : control === "human" ? "#75e4d3" : "#78aeb2"} emissive={reachable ? "#4eb7b4" : "#071317"} emissiveIntensity={reachable ? .8 : .18} roughness={.38} />
              </mesh>
              <mesh position={[.34, -.12, .18]} castShadow><boxGeometry args={[.12,.34,.12]} /><meshStandardMaterial color="#6f9da0" roughness={.55} /></mesh>
              <mesh position={[-.28, -.16, -.22]} castShadow><boxGeometry args={[.1,.26,.1]} /><meshStandardMaterial color="#517b82" roughness={.58} /></mesh>
            </group>
            {reachable && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .29, 0]}>
                <ringGeometry args={[1.07, 1.15, 40]} />
                <meshBasicMaterial color="#bffbfb" transparent opacity={.88} />
              </mesh>
            )}
            <Html center position={[0, .82, 0]} distanceFactor={8.6} style={{ pointerEvents: "auto" }}>
              <button
                type="button"
                className="strategy-3d-location"
                data-testid={`strategy-space-${space.id}`}
                data-reachable={reachable ? "true" : "false"}
                data-owner={control}
                disabled={!reachable}
                title={asset?.description ?? space.name}
                onClick={() => onMove(space.id)}
              >
                <span>{space.region}</span>
                <strong>{space.name}</strong>
                {asset && <small>{owner ? `${ownerSeat?.doctrineId ?? owner} · ${asset.name}` : asset.name}</small>}
                {reachable && <em>MOVE</em>}
              </button>
            </Html>
          </group>
        );
      })}

      {state.seats.map((seat, index) => (
        <Pawn
          key={seat.seatId}
          position={pointFor(state.execution.positions[seat.seatId]!)}
          control={controlForDoctrine(driver, seat.doctrineId)}
          label={seat.doctrineId}
          offset={index ? .28 : -.28}
        />
      ))}

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={.08}
        minDistance={7.8}
        maxDistance={13}
        minPolarAngle={.55}
        maxPolarAngle={1.12}
        minAzimuthAngle={-.55}
        maxAzimuthAngle={.55}
      />
    </Canvas>
  );
}
