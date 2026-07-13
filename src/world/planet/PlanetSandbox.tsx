import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Planet } from "./Planet.js";
import { Scatter } from "./ScatterLayer.js";
import { generatePlanet } from "./generatePlanet.js";
import { scatterOnPlanet } from "./scatter.js";

const RADIUS = 10;
const SEED = 1234;
const DETAIL = 5;

export function PlanetSandbox(): JSX.Element {
  // Generate the same geometry the Planet renders so scatter matches the surface.
  const items = useMemo(() => {
    const geo = generatePlanet({ radius: RADIUS, seed: SEED, detail: DETAIL });
    const result = scatterOnPlanet(geo, RADIUS, 120, SEED);
    geo.dispose();
    return result;
  }, []);

  return (
    <Canvas camera={{ position: [0, 8, 26], fov: 50 }} style={{ width: "100%", height: "100%" }}>
      <color attach="background" args={["#0d1117"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[15, 20, 10]} intensity={1.4} castShadow />
      <Planet radius={RADIUS} seed={SEED} detail={DETAIL} />
      <Scatter items={items} />
      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  );
}
