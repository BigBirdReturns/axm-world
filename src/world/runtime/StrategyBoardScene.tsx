import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Html, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import type { StrategyBoardDriverContract } from "../../engine/strategy-board/driver.js";
import type { StrategyBoardProgram } from "../../engine/strategy-board/program.js";
import type { StrategyBoardSession } from "./strategy-board-session.js";
import type { StrategyBoardExpressionPack } from "./strategy-board-expression.js";
import type { StrategySpaceMaterial } from "../expressions/types.js";

interface StrategyBoardSceneProps {
  program: StrategyBoardProgram;
  state: StrategyBoardSession["state"];
  driver: StrategyBoardDriverContract | null;
  legalMoves: ReadonlySet<string>;
  terminal: boolean;
  expression?: StrategyBoardExpressionPack | null;
  onMove: (spaceId: string) => void;
}

function controlForDoctrine(driver: StrategyBoardDriverContract | null, doctrineId: string): "human" | "automatic" | "seat" {
  return driver?.doctrines.find((entry) => entry.doctrineId === doctrineId)?.control ?? "seat";
}

const neutralMaterial: StrategySpaceMaterial = {
  kind: "site", atmosphere: "neutral", landmark: "Strategic site", populationHint: "local operators",
};
function Pawn({ control, standardUrl, position = [0, 0, 0] }: {
  control: "human" | "automatic" | "seat";
  standardUrl?: string;
  position?: [number, number, number];
}) {
  const color = control === "human" ? "#56e4d6" : control === "automatic" ? "#ff7c8f" : "#9bb2c0";
  return <group position={position}>
    <mesh castShadow><cylinderGeometry args={[.18, .27, .46, 12]} /><meshStandardMaterial color={color} roughness={.3} metalness={.18} /></mesh>
    <mesh position={[0, .35, 0]} castShadow><sphereGeometry args={[.2, 16, 12]} /><meshStandardMaterial color={color} roughness={.25} /></mesh>
    <pointLight color={color} intensity={2} distance={2.4} />
    {standardUrl && <Html center position={[0, .82, 0]} distanceFactor={8} style={{ pointerEvents: "none" }}>
      <div className="strategy-3d-standard"><img src={standardUrl} alt="" /><b>{control === "human" ? "YOU" : "CPU"}</b></div>
    </Html>}
  </group>;
}

function ImpactPulse({ control }: { control: "human" | "automatic" | "seat" }) {
  const group = useRef<Group>(null);
  const started = useRef<number | null>(null);
  const color = control === "automatic" ? "#ff7c8f" : "#56e4d6";
  useFrame(({ clock }) => {
    if (!group.current) return;
    if (started.current === null) started.current = clock.elapsedTime;
    const cycle = ((clock.elapsedTime - started.current) % 1.4) / 1.4;
    group.current.scale.setScalar(.7 + cycle * 2.6);
  });
  return <group ref={group} position={[0, .05, 0]}><mesh rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[.7, .77, 48]} /><meshBasicMaterial color={color} transparent opacity={.35} depthWrite={false} />
  </mesh></group>;
}
function Structure({ position, scale, color, shape = "box" }: {
  position: [number, number, number]; scale: [number, number, number]; color: string; shape?: "box" | "cone" | "cylinder";
}) {
  return <mesh position={position} castShadow receiveShadow>
    {shape === "box" ? <boxGeometry args={scale} /> : shape === "cone" ? <coneGeometry args={[scale[0], scale[1], 6]} /> : <cylinderGeometry args={[scale[0], scale[2], scale[1], 10]} />}
    <meshStandardMaterial color={color} roughness={.48} metalness={.08} />
  </mesh>;
}

function PlaceArchitecture({ material }: { material: StrategySpaceMaterial }) {
  const base = material.atmosphere === "integration" ? "#713447" : material.atmosphere === "reef" ? "#176f72" : "#167581";
  if (material.kind === "ward") return <group>
    <Structure position={[-1.5,.22,-.3]} scale={[1.1,.18,.7]} color="#d7ece8" />
    <Structure position={[0,.22,-.55]} scale={[1.1,.18,.7]} color="#d7ece8" />
    <Structure position={[1.5,.22,-.3]} scale={[1.1,.18,.7]} color="#d7ece8" />
    <Structure position={[0,1.05,-1.4]} scale={[.25,1.9,.25]} color="#78d5cf" shape="cylinder" />
    <mesh position={[0,2,-1.4]}><sphereGeometry args={[.28,16,12]} /><meshStandardMaterial color="#bffbf2" emissive="#4bb6ad" emissiveIntensity={1.2} /></mesh>
  </group>;
  if (material.kind === "harbor") return <group>
    <Structure position={[-1.7,.12,.2]} scale={[2.2,.18,.5]} color="#796a52" />
    <Structure position={[1.2,.12,-.45]} scale={[2.4,.18,.5]} color="#796a52" />
    <Structure position={[-.8,.72,-.25]} scale={[.12,1.35,.12]} color="#c79e58" />
    <Structure position={[.5,.58,-.75]} scale={[.1,1.05,.1]} color="#c79e58" />
  </group>;
  if (material.kind === "observatory") return <group>
    <mesh position={[0,.42,-.45]} castShadow><sphereGeometry args={[1.1,24,14,0,Math.PI*2,0,Math.PI/2]} /><meshStandardMaterial color="#c7ded9" roughness={.36} metalness={.14} /></mesh>
    <group position={[0,1.1,-.45]} rotation={[0,0,-.55]}><Structure position={[0,0,0]} scale={[.16,1.8,.16]} color="#d1b66f" shape="cylinder" /></group>
    <mesh position={[.55,1.6,-.45]} rotation={[0,0,-.55]}><cylinderGeometry args={[.28,.18,.8,14]} /><meshStandardMaterial color="#6ab9bd" metalness={.2} roughness={.3} /></mesh>
    <mesh position={[-1.7,.1,.2]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.55,.7,32]} /><meshStandardMaterial color="#8ac9c8" emissive="#235b62" emissiveIntensity={.5} /></mesh>
  </group>;
  if (material.kind === "embassy") return <group>
    {[-1.8,-1.1,-.45,.35,1.15,1.8].map((x,index) => <Structure key={x} position={[x,.45 + (index%3)*.18,-.35 - Math.abs(x)*.13]} scale={[.18,.9+(index%3)*.34,.18]} color={index%2?"#53b3aa":"#8b77b7"} shape="cone" />)}
    <mesh position={[0,.42,-.65]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.05,.1,12,36]} /><meshStandardMaterial color="#d6d0ad" roughness={.4} /></mesh>
  </group>;
  if (material.kind === "spine") return <group>
    {[-1.6,-.8,0,.8,1.6].map((x,index) => <Structure key={x} position={[x,.75,-.55-Math.abs(x)*.08]} scale={[.2,1.5+(index%2)*.6,.2]} color={base} shape="cylinder" />)}
    <Structure position={[0,.18,.2]} scale={[4.2,.18,.45]} color="#6e4654" />
    <pointLight position={[0,1.3,-.7]} color="#ff7c8f" intensity={2.4} distance={6} />
  </group>;
  if (material.kind === "council") return <group>
    <mesh position={[0,.14,-.45]}><cylinderGeometry args={[2.0,2.25,.25,32]} /><meshStandardMaterial color="#155b65" roughness={.5} /></mesh>
    <mesh position={[0,.32,-.45]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.35,.08,12,48]} /><meshStandardMaterial color="#d1b66f" metalness={.2} /></mesh>
    <mesh position={[0,1.2,-.45]}><sphereGeometry args={[.5,24,16]} /><meshStandardMaterial color="#7bcac7" transparent opacity={.6} emissive="#205d67" emissiveIntensity={.7} /></mesh>
  </group>;
  return <group>
    <Structure position={[-1.1,.45,-.5]} scale={[.6,.9,.6]} color={base} shape="cylinder" />
    <Structure position={[0,.7,-.85]} scale={[.8,1.4,.8]} color="#6d9298" shape="cylinder" />
    <Structure position={[1.1,.38,-.5]} scale={[.55,.76,.55]} color={base} shape="cylinder" />
  </group>;
}

function DestinationGate({ x, space, assetName, reachable, onMove }: {
  x: number;
  space: StrategyBoardProgram["definition"]["spaces"][number];
  assetName?: string;
  reachable: boolean;
  onMove: () => void;
}) {
  return <group position={[x,0,-3.25]}>
    <Structure position={[-.58,.85,0]} scale={[.18,1.7,.22]} color={reachable?"#75d8d1":"#334c55"} />
    <Structure position={[.58,.85,0]} scale={[.18,1.7,.22]} color={reachable?"#75d8d1":"#334c55"} />
    <Structure position={[0,1.62,0]} scale={[1.35,.16,.22]} color={reachable?"#d4ddd1":"#40555e"} />
    {reachable && <pointLight position={[0,1,0]} color="#65e2db" intensity={1.6} distance={3.3} />}
    <Html center position={[0,2.15,0]} distanceFactor={7.2} style={{ pointerEvents: "auto" }}>
      <button type="button" className="strategy-place-gate" data-testid={`strategy-space-${space.id}`} data-reachable={reachable?"true":"false"} disabled={!reachable} onClick={onMove}>
        <span>{space.region}</span><strong>{space.name}</strong>{assetName && <small>{assetName}</small>}<em>{reachable?"TRAVEL":"BLOCKED"}</em>
      </button>
    </Html>
  </group>;
}
export function StrategyBoardScene({ program, state, driver, legalMoves, terminal, expression, onMove }: StrategyBoardSceneProps): JSX.Element {
  const def = program.definition;
  const humanSeat = state.seats.find((seat) => controlForDoctrine(driver, seat.doctrineId) === "human") ?? state.seats[0]!;
  const opponentSeat = state.seats.find((seat) => controlForDoctrine(driver, seat.doctrineId) === "automatic") ?? state.seats[1];
  const currentId = state.execution.positions[humanSeat.seatId]!;
  const current = def.spaces.find((space) => space.id === currentId)!;
  const currentAsset = def.controlAssets.find((asset) => asset.sitedOnSpaceId === current.id);
  const material = expression?.spaces[current.id] ?? neutralMaterial;
  const adjacent = current.adjacentSpaceIds.map((id) => def.spaces.find((space) => space.id === id)!).filter(Boolean);
  const gateXs = adjacent.length === 1 ? [0] : adjacent.length === 2 ? [-2.7, 2.7] : [-4.1, 0, 4.1];
  const opponentSpaceId = opponentSeat ? state.execution.positions[opponentSeat.seatId] : null;
  const opponentSpace = opponentSpaceId ? def.spaces.find((space) => space.id === opponentSpaceId) : null;
  const sameSpace = opponentSpaceId === currentId;
  const lastLedger = state.execution.ledger.at(-1);
  const impactControl = lastLedger ? controlForDoctrine(driver, state.seats.find((seat) => seat.seatId === lastLedger.seatId)?.doctrineId ?? "") : "seat";

  return <Canvas data-testid="strategy-3d-scene" className="strategy-3d" dpr={[1,1.5]} gl={{ alpha:true, antialias:true }} shadows camera={{ position:[0,4.4,8.8], fov:42, near:.1, far:60 }} onCreated={({camera})=>camera.lookAt(0,.75,-.6)}>
    <fog attach="fog" args={["#03101a",8,22]} />
    <ambientLight intensity={.95} />
    <directionalLight position={[-5,8,5]} intensity={2.2} color="#c9ece7" castShadow />
    <directionalLight position={[6,4,-4]} intensity={.55} color="#7e9fbd" />
    <Stars radius={35} depth={16} count={500} factor={1.8} saturation={.1} fade speed={.1} />
    <Sparkles count={75} scale={[13,3,8]} size={1.15} speed={.15} opacity={.22} color="#80d8dc" />
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]} receiveShadow>
      <planeGeometry args={[18,13]} />
      <meshStandardMaterial color={material.atmosphere === "integration" ? "#25111b" : material.atmosphere === "reef" ? "#062e36" : "#082a34"} roughness={.82} metalness={.02} />
    </mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.005,-.5]}>
      <ringGeometry args={[2.8,3.05,64]} />
      <meshBasicMaterial color={material.atmosphere === "integration" ? "#b9536d" : "#5ccac4"} transparent opacity={.28} />
    </mesh>

    <PlaceArchitecture material={material} />
    <Html center position={[-4.9,2.5,-.8]} distanceFactor={8.2} style={{ pointerEvents:"none" }}>
      <div className="strategy-place-title" data-testid="strategy-current-place">
        <span>{current.region}</span><strong>{current.name}</strong>
        <small>{material.landmark}</small><em>{material.populationHint}</em>
      </div>
    </Html>

    <Pawn control="human" standardUrl={expression?.standards.human} position={[-1.1,.25,2.0]} />
    {sameSpace && opponentSeat && <Pawn control="automatic" standardUrl={expression?.standards.automatic} position={[1.1,.25,1.85]} />}
    {!sameSpace && opponentSpace && <Html center position={[4.7,2.1,-1.1]} distanceFactor={8.4} style={{ pointerEvents:"none" }}>
      <div className="strategy-place-opponent"><span>OPPONENT PRESSURE</span><strong>{opponentSpace.name}</strong></div>
    </Html>}

    {lastLedger && <ImpactPulse key={state.execution.ledger.length} control={impactControl} />}
    {!terminal && state.phase === "movementResolution" && adjacent.map((space,index) => {
      const asset = def.controlAssets.find((item) => item.sitedOnSpaceId === space.id);
      const reachable = legalMoves.has(space.id);
      return <DestinationGate key={space.id} x={gateXs[index] ?? 0} space={space} assetName={asset?.name} reachable={reachable} onMove={() => onMove(space.id)} />;
    })}

    <OrbitControls
      makeDefault
      target={[0,.7,-.6]}
      enablePan={false}
      enableDamping
      dampingFactor={.08}
      minDistance={7.2}
      maxDistance={10.5}
      minPolarAngle={.78}
      maxPolarAngle={1.15}
      minAzimuthAngle={-.38}
      maxAzimuthAngle={.38}
    />
  </Canvas>;
}
