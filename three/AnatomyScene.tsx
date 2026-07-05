"use client";

import { Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import CarModel from "@/three/CarModel";
import LightRig from "@/three/LightRig";
import ContextGuard, {
  useCanvasRecovery,
  CanvasBoundary,
  RestartPanel,
} from "@/three/ContextGuard";
import { useStore } from "@/lib/store";
import { scrollBus } from "@/lib/scrollBus";

/** keeps the orbit target on the car as the exploded view lifts it */
function TargetLift() {
  const controls = useThree((s) => s.controls) as unknown as {
    target?: THREE.Vector3;
  } | null;
  useFrame((_, dt) => {
    if (!controls?.target) return;
    const t = Math.max(useStore.getState().explodeAmount, scrollBus.explode);
    controls.target.y = THREE.MathUtils.damp(
      controls.target.y,
      0.45 + t * 0.5,
      5,
      dt,
    );
  });
  return null;
}

/**
 * The anatomy explorer's own canvas: orbitable, zoomable, parts clickable.
 * Kept lighter than the hero (capped DPR, MSAA only on high tier, no
 * reflector) and mounted ONLY while the garage is near the viewport — the
 * hero and garage never hold two live WebGL contexts at once. Context loss
 * remounts with backoff; repeated loss shows a restart panel.
 */
export default function AnatomyScene({ active }: { active: boolean }) {
  const glTier = useStore((s) => s.glTier);
  const selectPart = useStore((s) => s.selectPart);
  const reduceMotion = useStore((s) => s.reduceMotion);
  const selectedPart = useStore((s) => s.selectedPart);
  const { canvasKey, onContextLost, failed, restart } = useCanvasRecovery();
  const high = glTier === "high";

  if (failed) return <RestartPanel onRetry={restart} />;

  return (
    <CanvasBoundary resetKey={canvasKey} onRetry={restart}>
      <Canvas
        key={canvasKey}
        frameloop={active ? "always" : "never"}
        dpr={high ? [1, 1.5] : [1, 1.1]}
        camera={{ fov: 36, position: [6.2, 2.2, 6.2], near: 0.1, far: 80 }}
        gl={{ alpha: true, antialias: high, powerPreference: "default" }}
        onPointerMissed={() => selectPart(null)}
      >
        <ContextGuard onLost={onContextLost} />
        <Suspense fallback={null}>
          <LightRig />
          <CarModel selectable showConfig position={[0, 0.02, 0]} />
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={4.2}
            maxDistance={11}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, 0.45, 0]}
            autoRotate={!reduceMotion && !selectedPart}
            autoRotateSpeed={0.5}
          />
          <TargetLift />
        </Suspense>
      </Canvas>
    </CanvasBoundary>
  );
}
