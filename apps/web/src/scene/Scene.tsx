import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

export default function Scene() {
  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: [3, 2, 3] }}
      style={{ height: "100%", width: "100%" }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0, 0);
      }}
    >
      <color attach="background" args={["#e0f2fe"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <gridHelper args={[10, 10]} />
      <axesHelper args={[2]} />
      <OrbitControls />
    </Canvas>
  );
}
