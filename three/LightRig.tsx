"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
} from "@react-three/drei";
import { damp, dampC } from "maath/easing";
import { useStore, type Theme } from "@/lib/store";

/**
 * Theme switching for the 3D environment. CSS custom properties can restyle
 * the DOM, but they can't touch a WebGL scene — so the rig keeps a numeric
 * preset per theme and eases every light/material value toward the active
 * preset inside useFrame. Flipping the pit-wall switch cross-fades the whole
 * environment (studio night -> daylight pit lane) instead of hard-cutting.
 *
 * The <Environment> is built from local Lightformers (no HDR fetch): the
 * overhead softbox strips are what make the clearcoat paint read as paint.
 * The canvas stays transparent; fog matches the page background token, so
 * the 2D and 3D worlds always agree.
 */

interface Preset {
  ambient: number;
  hemi: number;
  hemiSky: string;
  hemiGround: string;
  key: number;
  keyColor: string;
  fill: number;
  rim: number;
  env: number;
  fog: string;
  fogFar: number;
  floor: string;
  props: number; // garage light bars + red glow wall (night only)
  checker: number;
}

const PRESETS: Record<Theme, Preset> = {
  "race-night": {
    ambient: 0.3,
    hemi: 0.35,
    hemiSky: "#2a2a38",
    hemiGround: "#0b0b0d",
    key: 260,
    keyColor: "#ffe7c4",
    fill: 0.55,
    rim: 45,
    env: 0.6,
    fog: "#0b0b0d",
    fogFar: 30,
    floor: "#09090b",
    props: 1,
    checker: 0.14,
  },
  "pit-lane": {
    ambient: 1.1,
    hemi: 1.2,
    hemiSky: "#eaf1ff",
    hemiGround: "#c9c9c2",
    key: 300,
    keyColor: "#ffffff",
    fill: 1.0,
    rim: 5,
    env: 1.25,
    fog: "#e9e9e5",
    fogFar: 44,
    floor: "#a9a9a4",
    props: 0,
    checker: 0.5,
  },
};

function makeCheckerTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#0c0c0e" : "#f4f4f0";
      ctx.fillRect(x * 8, y * 8, 8, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function LightRig({
  reflectiveFloor = false,
}: {
  /** mirror-polish studio floor (hero, high tier only — extra render pass) */
  reflectiveFloor?: boolean;
}) {
  const theme = useStore((s) => s.theme);
  const preset = PRESETS[theme];
  const scene = useThree((s) => s.scene);

  const ambient = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.PointLight>(null);
  const fog = useRef<THREE.Fog>(null);
  const floorMat = useRef<THREE.MeshStandardMaterial>(null);
  const checkerMat = useRef<THREE.MeshBasicMaterial>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);

  const checkerTex = useMemo(() => makeCheckerTexture(), []);
  const barMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: "#cdd5e8", transparent: true, opacity: 1 }),
    [],
  );
  useEffect(
    () => () => {
      checkerTex.dispose();
      barMaterial.dispose();
    },
    [checkerTex, barMaterial],
  );

  useFrame((_, dt) => {
    const p = preset;
    if (ambient.current) damp(ambient.current, "intensity", p.ambient, 0.4, dt);
    if (hemi.current) {
      damp(hemi.current, "intensity", p.hemi, 0.4, dt);
      dampC(hemi.current.color, p.hemiSky, 0.4, dt);
      dampC(hemi.current.groundColor, p.hemiGround, 0.4, dt);
    }
    if (key.current) {
      damp(key.current, "intensity", p.key, 0.4, dt);
      dampC(key.current.color, p.keyColor, 0.4, dt);
    }
    if (fill.current) damp(fill.current, "intensity", p.fill, 0.4, dt);
    if (rim.current) damp(rim.current, "intensity", p.rim, 0.4, dt);
    if (fog.current) {
      dampC(fog.current.color, p.fog, 0.4, dt);
      damp(fog.current, "far", p.fogFar, 0.4, dt);
    }
    damp(scene, "environmentIntensity", p.env, 0.4, dt);
    if (floorMat.current) dampC(floorMat.current.color, p.floor, 0.4, dt);
    if (checkerMat.current) damp(checkerMat.current, "opacity", p.checker, 0.4, dt);
    damp(barMaterial, "opacity", p.props, 0.4, dt);
    if (glowMat.current) damp(glowMat.current, "opacity", p.props * 0.18, 0.4, dt);
  });

  return (
    <>
      <fog ref={fog} attach="fog" args={["#0b0b0d", 10, 30]} />
      <ambientLight ref={ambient} intensity={0.3} />
      <hemisphereLight ref={hemi} intensity={0.35} />
      <spotLight
        ref={key}
        position={[4, 7, 3]}
        angle={0.6}
        penumbra={0.8}
        decay={1.6}
        intensity={260}
      />
      <directionalLight ref={fill} position={[-5, 4, -4]} intensity={0.55} />
      {/* red rim glow behind the car — garage signage at night */}
      <pointLight ref={rim} position={[-5, 1.2, -3]} color="#ff2800" decay={1.8} intensity={45} />

      {/* studio softboxes -> env reflections on the clearcoat (local, no fetch) */}
      <Environment frames={1} resolution={128}>
        <Lightformer intensity={3} rotation-x={Math.PI / 2} position={[0, 4, 0]} scale={[9, 1.6, 1]} />
        <Lightformer intensity={1.6} rotation-x={Math.PI / 2} position={[0, 4, -2.6]} scale={[9, 0.9, 1]} />
        <Lightformer intensity={1.6} rotation-x={Math.PI / 2} position={[0, 4, 2.6]} scale={[9, 0.9, 1]} />
        <Lightformer intensity={1.1} rotation-y={Math.PI / 2} position={[-7, 1.4, 0]} scale={[5, 1.2, 1]} />
        <Lightformer intensity={1.1} rotation-y={-Math.PI / 2} position={[7, 1.4, 0]} scale={[5, 1.2, 1]} />
        <Lightformer color="#ff3018" intensity={0.5} rotation-y={Math.PI / 4} position={[-5, 1, -5]} scale={[3, 1, 1]} />
      </Environment>

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <circleGeometry args={[18, 48]} />
        {reflectiveFloor ? (
          <MeshReflectorMaterial
            // MeshReflectorMaterial extends MeshStandardMaterial; callback ref
            // sidesteps the invariant RefObject typing
            ref={(m) => {
              floorMat.current = m;
            }}
            color="#09090b"
            blur={[320, 90]}
            resolution={512}
            mixBlur={1}
            mixStrength={2.2}
            roughness={0.75}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            metalness={0.45}
            mirror={0.6}
          />
        ) : (
          <meshStandardMaterial ref={floorMat} color="#09090b" roughness={0.9} metalness={0.1} />
        )}
      </mesh>
      {/* painted start-line checker strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.9, 0.002, 0]}>
        <planeGeometry args={[0.9, 9]} />
        <meshBasicMaterial ref={checkerMat} map={checkerTex} transparent opacity={0.14} />
      </mesh>
      {/* garage light bars (fade out in daylight) — shared material */}
      <mesh position={[0, 4.4, -2.2]} material={barMaterial}>
        <boxGeometry args={[7, 0.06, 0.18]} />
      </mesh>
      <mesh position={[0, 4.4, 2.2]} material={barMaterial}>
        <boxGeometry args={[7, 0.06, 0.18]} />
      </mesh>
      {/* red glow wall behind the car */}
      <mesh position={[-9, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[11, 5]} />
        <meshBasicMaterial ref={glowMat} color="#ff2800" transparent opacity={0.3} />
      </mesh>

      <ContactShadows
        position={[0, 0.004, 0]}
        scale={13}
        blur={2.2}
        far={2.2}
        opacity={theme === "race-night" ? 0.8 : 0.45}
        resolution={384}
      />
    </>
  );
}
