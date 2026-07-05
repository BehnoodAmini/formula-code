"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import CarModel from "@/three/CarModel";
import GltfCar from "@/three/GltfCar";
import LightRig from "@/three/LightRig";
import CameraRig from "@/three/CameraRig";
import ContextGuard, {
  useCanvasRecovery,
  CanvasBoundary,
  RestartPanel,
} from "@/three/ContextGuard";
import { useStore } from "@/lib/store";

/**
 * Hero canvas. Pointer events are disabled (parallax comes from a window
 * listener writing to the scroll bus) so the canvas never swallows scroll
 * or text selection. The host (Hero.tsx) unmounts this entirely when far
 * off-screen — one live WebGL context at a time keeps weak GPUs alive.
 * Context loss remounts with backoff; repeated loss shows a restart panel.
 */
export default function HeroScene({ active }: { active: boolean }) {
  const glTier = useStore((s) => s.glTier);
  const { canvasKey, onContextLost, failed, restart } = useCanvasRecovery();
  const high = glTier === "high";

  if (failed) return <RestartPanel onRetry={restart} />;

  return (
    <CanvasBoundary resetKey={canvasKey} onRetry={restart}>
      <Canvas
        key={canvasKey}
        frameloop={active ? "always" : "never"}
        dpr={high ? [1, 1.75] : [1, 1.2]}
        camera={{ fov: 33, position: [9.6, 0.6, 2.0], near: 0.1, far: 80 }}
        gl={{ alpha: true, antialias: high, powerPreference: "default" }}
        style={{ pointerEvents: "none" }}
        aria-hidden
      >
        <ContextGuard onLost={onContextLost} />
        <Suspense fallback={null}>
          <CameraRig />
          <LightRig reflectiveFloor={high} />
          {high ? (
            // photoreal GLTF car; the procedural twin fills in while it loads
            <Suspense fallback={<CarModel position={[0, 0.02, 0]} />}>
              <GltfCar position={[0, 0.02, 0]} />
            </Suspense>
          ) : (
            <CarModel position={[0, 0.02, 0]} />
          )}
        </Suspense>
      </Canvas>
    </CanvasBoundary>
  );
}
