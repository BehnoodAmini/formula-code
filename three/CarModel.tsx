"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox, useCursor } from "@react-three/drei";
import { useStore } from "@/lib/store";
import { scrollBus } from "@/lib/scrollBus";
import type { PartId } from "@/lib/carParts";
import type { FrontWingOpt, RearWingOpt, TireOpt } from "@/lib/lapSim";

/**
 * The parametric "schematic twin": an ORIGINAL ground-effect single-seater
 * built from curved procedural geometry — lathe-turned nose, extruded
 * cambered wing profiles, capsule-sculpted sidepods/engine cover — to real
 * proportions (3.6 m wheelbase, 720 mm wheels). No branding by design.
 *
 * It stays parametric on purpose: every anatomy part is a <PartGroup> that
 * explodes/highlights, the DRS flap hinges, and the Build-game config
 * physically reshapes wings and tire markings — things a scanned mesh can't
 * do. Continuous values are read imperatively inside useFrame, never through
 * React renders.
 *
 * Coordinates: +X forward, Y up, Z right. Floor plane at y = 0.
 */

const RED = "#b8120a";
const CARBON = "#141419";
const DARK = "#0b0b0e";
const GOLD = "#d4af37";
const RUBBER = "#121214";

const HIGHLIGHT = "#ff2800";

type MatDef = { c: string; m?: number; r?: number; paint?: boolean };

function useMats(defs: MatDef[]) {
  const mats = useMemo(
    () =>
      defs.map((d) => {
        const common = {
          color: d.c,
          metalness: d.m ?? 0.6,
          roughness: d.r ?? 0.4,
          emissive: new THREE.Color(HIGHLIGHT),
          emissiveIntensity: 0,
        };
        return d.paint
          ? new THREE.MeshPhysicalMaterial({
              ...common,
              metalness: d.m ?? 0.15,
              roughness: d.r ?? 0.3,
              clearcoat: 1,
              clearcoatRoughness: 0.18,
            })
          : new THREE.MeshStandardMaterial(common);
      }),
    // static literal defs; created once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return mats;
}

/** cylinder strut between two exact points — suspension arms, wing mounts */
function Strut({
  from,
  to,
  r = 0.014,
  material,
}: {
  from: [number, number, number];
  to: [number, number, number];
  r?: number;
  material: THREE.Material;
}) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    return { pos: a.add(b).multiplyScalar(0.5), quat, len };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...from, ...to]);
  return (
    <mesh position={pos} quaternion={quat} material={material}>
      <cylinderGeometry args={[r, r, len, 10]} />
    </mesh>
  );
}

/**
 * A cambered wing element: 2D airfoil-ish profile extruded across the span.
 * Leading edge at +X, trailing edge rising toward -X — reads as a sculpted
 * aero surface instead of a box.
 */
function WingElement({
  chord,
  span,
  rise,
  camber,
  thick = 0.024,
  position,
  angle = 0,
  scaleX = 1,
  material,
}: {
  chord: number;
  span: number;
  rise: number;
  camber: number;
  thick?: number;
  position: [number, number, number];
  angle?: number;
  scaleX?: number;
  material: THREE.Material;
}) {
  const { shape, settings } = useMemo(() => {
    const c = chord / 2;
    const s = new THREE.Shape();
    s.moveTo(c, 0);
    s.quadraticCurveTo(0, -camber, -c, rise);
    s.lineTo(-c, rise + thick);
    s.quadraticCurveTo(0, -camber + thick, c, thick);
    s.closePath();
    return {
      shape: s,
      settings: { depth: span, bevelEnabled: false, curveSegments: 10, steps: 1 },
    };
  }, [chord, span, rise, camber, thick]);
  return (
    <group position={position} rotation={[0, 0, angle]} scale={[scaleX, 1, 1]}>
      <mesh position={[0, 0, -span / 2]} material={material}>
        <extrudeGeometry args={[shape, settings]} />
      </mesh>
    </group>
  );
}

/** capsule aligned to the X axis — the organic bodywork building block */
function BodyCapsule({
  r,
  len,
  position,
  scale = [1, 1, 1],
  pitch = 0,
  yaw = 0,
  material,
}: {
  r: number;
  len: number;
  position: [number, number, number];
  scale?: [number, number, number];
  pitch?: number;
  yaw?: number;
  material: THREE.Material;
}) {
  return (
    <group position={position} rotation={[0, yaw, pitch]} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={material}>
        <capsuleGeometry args={[r, len, 6, 20]} />
      </mesh>
    </group>
  );
}

interface PartGroupProps {
  id: PartId;
  explodeDir: [number, number, number];
  explodeRef: React.MutableRefObject<number>;
  selectable: boolean;
  mats: THREE.MeshStandardMaterial[];
  children: React.ReactNode;
}

function PartGroup({
  id,
  explodeDir,
  explodeRef,
  selectable,
  mats,
  children,
}: PartGroupProps) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(selectable && hovered);
  const selected = useStore((s) => s.selectedPart === id);
  const selectPart = useStore((s) => s.selectPart);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = explodeRef.current;
    g.position.set(explodeDir[0] * t, explodeDir[1] * t, explodeDir[2] * t);
    const pulse = selected
      ? 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.22
      : selectable && hovered
        ? 0.3
        : 0;
    for (const m of mats) {
      m.emissiveIntensity = THREE.MathUtils.damp(m.emissiveIntensity, pulse, 9, dt);
    }
  });

  const events = selectable
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          selectPart(id);
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
        },
        onPointerOut: () => setHovered(false),
      }
    : {};

  return (
    <group ref={group} name={id} {...events}>
      {children}
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/* chassis: tub, lathe nose, cockpit, halo, airbox — not a listed part     */
/* ---------------------------------------------------------------------- */

const NOSE_PROFILE = [
  [0.155, 0],
  [0.15, 0.25],
  [0.135, 0.5],
  [0.115, 0.75],
  [0.09, 0.95],
  [0.065, 1.15],
  [0.04, 1.3],
  [0.018, 1.38],
].map(([r, y]) => new THREE.Vector2(r, y));

function Chassis() {
  const [red, dark, gold, carbon] = useMats([
    { c: RED, paint: true },
    { c: DARK, m: 0.3, r: 0.6 },
    { c: GOLD, m: 0.95, r: 0.25 },
    { c: CARBON, m: 0.7, r: 0.38 },
  ]);
  return (
    <group name="chassis">
      {/* survival cell, low and slender, generous corner radii */}
      <RoundedBox args={[2.1, 0.3, 0.5]} radius={0.11} smoothness={5} position={[0.5, 0.27, 0]} material={red} />
      <RoundedBox args={[1.15, 0.26, 0.44]} radius={0.1} smoothness={5} position={[0.22, 0.5, 0]} material={red} />
      {/* cockpit opening + headrest */}
      <mesh position={[0.38, 0.615, 0]} material={dark}>
        <boxGeometry args={[0.6, 0.05, 0.3]} />
      </mesh>
      <RoundedBox args={[0.26, 0.1, 0.32]} radius={0.04} position={[-0.12, 0.6, 0]} material={dark} />
      {/* lathe-turned nose: smooth taper, flattened section, slight droop */}
      <mesh
        position={[1.44, 0.37, 0]}
        rotation={[0, 0, -Math.PI / 2 - 0.045]}
        scale={[0.62, 1, 1.25]}
        material={red}
      >
        <latheGeometry args={[NOSE_PROFILE, 28]} />
      </mesh>
      {/* halo: tilted nose-down, grounded by three legs */}
      <mesh position={[0.32, 0.69, 0]} rotation={[-Math.PI / 2, 0, 0.12]} material={carbon}>
        <torusGeometry args={[0.29, 0.026, 10, 32]} />
      </mesh>
      <Strut from={[0.58, 0.52, 0]} to={[0.6, 0.66, 0]} r={0.016} material={gold} />
      <Strut from={[0.08, 0.58, 0.22]} to={[0.11, 0.7, 0.2]} r={0.02} material={carbon} />
      <Strut from={[0.08, 0.58, -0.22]} to={[0.11, 0.7, -0.2]} r={0.02} material={carbon} />
      {/* airbox intake + T-cam */}
      <mesh position={[-0.1, 0.78, 0]} rotation={[0, 0, Math.PI / 2]} material={dark}>
        <cylinderGeometry args={[0.075, 0.1, 0.12, 16]} />
      </mesh>
      <mesh position={[-0.28, 0.94, 0]} material={carbon}>
        <boxGeometry args={[0.05, 0.09, 0.04]} />
      </mesh>
      <mesh position={[-0.28, 0.99, 0]} material={carbon}>
        <boxGeometry args={[0.05, 0.045, 0.22]} />
      </mesh>
      {/* mirrors */}
      <mesh position={[0.78, 0.62, 0.44]} material={carbon}>
        <boxGeometry args={[0.05, 0.05, 0.11]} />
      </mesh>
      <mesh position={[0.78, 0.62, -0.44]} material={carbon}>
        <boxGeometry args={[0.05, 0.05, 0.11]} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/* front wing: cambered extruded elements + endplates with dive planes     */
/* ---------------------------------------------------------------------- */

function FrontWing({
  level,
  ...part
}: { level: FrontWingOpt } & Omit<PartGroupProps, "children" | "mats">) {
  const mats = useMats([
    { c: CARBON, m: 0.7, r: 0.38 },
    { c: RED, paint: true },
  ]);
  const [carbon, red] = mats;
  const k = level === "hi" ? 1.3 : level === "low" ? 0.55 : 1;
  return (
    <PartGroup {...part} mats={mats}>
      <WingElement chord={0.42} span={1.7} rise={0.015} camber={0.035} position={[2.58, 0.06, 0]} material={carbon} />
      <WingElement chord={0.32} span={1.66} rise={0.1} camber={0.03} position={[2.47, 0.1, 0]} angle={-0.08 * k} material={red} />
      <WingElement chord={0.24} span={1.58} rise={0.11} camber={0.025} position={[2.38, 0.17, 0]} angle={-0.16 * k} material={carbon} />
      {level === "hi" && (
        <WingElement chord={0.18} span={1.5} rise={0.1} camber={0.02} position={[2.31, 0.24, 0]} angle={-0.26} material={red} />
      )}
      {/* endplates with an attached dive plane */}
      {[1, -1].map((s) => (
        <group key={s} position={[2.52, 0.14, s * 0.87]} rotation={[0, s * 0.08, 0]}>
          <RoundedBox args={[0.36, 0.19, 0.018]} radius={0.03} smoothness={4} material={carbon} />
          <mesh position={[0.07, 0.1, s * -0.04]} rotation={[s * 0.3, 0, -0.25]} material={red}>
            <boxGeometry args={[0.14, 0.012, 0.09]} />
          </mesh>
        </group>
      ))}
      {/* pylons connecting the wing to the nose underside */}
      <mesh position={[2.5, 0.18, 0.09]} material={carbon}>
        <boxGeometry args={[0.06, 0.2, 0.028]} />
      </mesh>
      <mesh position={[2.5, 0.18, -0.09]} material={carbon}>
        <boxGeometry args={[0.06, 0.2, 0.028]} />
      </mesh>
    </PartGroup>
  );
}

/* ---------------------------------------------------------------------- */
/* floor & diffuser                                                        */
/* ---------------------------------------------------------------------- */

function Floor(part: Omit<PartGroupProps, "children" | "mats">) {
  const mats = useMats([{ c: CARBON, m: 0.7, r: 0.42 }]);
  const [carbon] = mats;
  return (
    <PartGroup {...part} mats={mats}>
      <mesh position={[0.2, 0.075, 0]} material={carbon}>
        <boxGeometry args={[2.3, 0.045, 1.34]} />
      </mesh>
      <mesh position={[-1.35, 0.075, 0]} material={carbon}>
        <boxGeometry args={[0.9, 0.045, 0.98]} />
      </mesh>
      {/* curved floor-edge wings */}
      {[1, -1].map((s) => (
        <WingElement
          key={s}
          chord={1.15}
          span={0.13}
          rise={0.03}
          camber={0.01}
          thick={0.016}
          position={[0.35, 0.115, s * 0.72]}
          material={carbon}
        />
      ))}
      {/* diffuser: rising center + flared sides + fences */}
      <mesh position={[-2.05, 0.19, 0]} rotation={[0, 0, -0.34]} material={carbon}>
        <boxGeometry args={[0.62, 0.028, 0.92]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[-2.0, 0.17, s * 0.52]}
          rotation={[s * 0.28, 0, -0.3]}
          material={carbon}
        >
          <boxGeometry args={[0.55, 0.024, 0.3]} />
        </mesh>
      ))}
      {[-0.3, 0, 0.3].map((z) => (
        <mesh key={z} position={[-2.03, 0.23, z]} rotation={[0, 0, -0.34]} material={carbon}>
          <boxGeometry args={[0.6, 0.14, 0.014]} />
        </mesh>
      ))}
    </PartGroup>
  );
}

/* ---------------------------------------------------------------------- */
/* power unit: capsule-sculpted sidepods, coke-bottle, engine cover, fin   */
/* ---------------------------------------------------------------------- */

function PowerUnit(part: Omit<PartGroupProps, "children" | "mats">) {
  const mats = useMats([
    { c: RED, paint: true },
    { c: DARK, m: 0.3, r: 0.6 },
    { c: GOLD, m: 0.95, r: 0.25 },
    { c: CARBON, m: 0.7, r: 0.38 },
  ]);
  const [red, dark, gold, carbon] = mats;
  return (
    <PartGroup {...part} mats={mats}>
      {[1, -1].map((s) => (
        <group key={s}>
          {/* sidepod: one wide flat capsule reaching in to the tub, so pod +
              shoulder read as a single volume (undercut gap below) */}
          <BodyCapsule
            r={0.25}
            len={0.65}
            position={[-0.15, 0.42, s * 0.36]}
            scale={[1, 0.62, 1.5]}
            pitch={0.05}
            material={red}
          />
          {/* radiator inlet */}
          <mesh position={[0.55, 0.44, s * 0.44]} material={dark}>
            <boxGeometry args={[0.06, 0.18, 0.3]} />
          </mesh>
          {/* coke-bottle taper, tucked tight against the spine */}
          <BodyCapsule
            r={0.16}
            len={0.85}
            position={[-0.9, 0.32, s * 0.2]}
            scale={[1, 0.72, 1.1]}
            yaw={s * -0.1}
            pitch={0.03}
            material={red}
          />
        </group>
      ))}
      {/* engine cover spine: wide over the pods, tapering down to the box */}
      <BodyCapsule r={0.22} len={1.0} position={[-0.5, 0.56, 0]} scale={[1, 0.9, 1.0]} pitch={0.08} material={red} />
      <BodyCapsule r={0.13} len={0.9} position={[-1.5, 0.42, 0]} scale={[1, 0.85, 0.7]} pitch={0.05} material={red} />
      {/* shark fin + gold pinstripe */}
      <mesh position={[-1.55, 0.6, 0]} rotation={[0, 0, 0.06]} material={red}>
        <boxGeometry args={[0.85, 0.22, 0.018]} />
      </mesh>
      <mesh position={[-0.9, 0.75, 0]} rotation={[0, 0, 0.09]} material={gold}>
        <boxGeometry args={[1.05, 0.012, 0.045]} />
      </mesh>
      {/* exhaust */}
      <mesh position={[-2.12, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} material={carbon}>
        <cylinderGeometry args={[0.04, 0.05, 0.16, 14]} />
      </mesh>
    </PartGroup>
  );
}

/* ---------------------------------------------------------------------- */
/* suspension: wishbone pairs + pushrod per corner, exact endpoints        */
/* ---------------------------------------------------------------------- */

const CORNERS: [number, number][] = [
  [1.8, 1],
  [1.8, -1],
  [-1.8, 1],
  [-1.8, -1],
];

function Suspension(part: Omit<PartGroupProps, "children" | "mats">) {
  const mats = useMats([{ c: CARBON, m: 0.7, r: 0.35 }]);
  const [carbon] = mats;
  return (
    <PartGroup {...part} mats={mats}>
      {CORNERS.map(([fx, sz]) => {
        const bodyZ = sz * (Math.abs(fx) > 1 && fx < 0 ? 0.16 : 0.24);
        const hub: [number, number, number] = [fx, 0.36, sz * 0.6];
        return (
          <group key={`${fx}${sz}`}>
            <Strut from={[fx + 0.3, 0.48, bodyZ]} to={[hub[0] + 0.03, 0.46, hub[2]]} material={carbon} />
            <Strut from={[fx - 0.3, 0.48, bodyZ]} to={[hub[0] - 0.03, 0.46, hub[2]]} material={carbon} />
            <Strut from={[fx + 0.3, 0.2, bodyZ]} to={[hub[0] + 0.03, 0.24, hub[2]]} material={carbon} />
            <Strut from={[fx - 0.3, 0.2, bodyZ]} to={[hub[0] - 0.03, 0.24, hub[2]]} material={carbon} />
            <Strut from={[fx + 0.05, 0.5, bodyZ]} to={[fx, 0.26, sz * 0.58]} r={0.012} material={carbon} />
            <mesh position={[fx, 0.36, sz * 0.62]} material={carbon}>
              <boxGeometry args={[0.1, 0.22, 0.05]} />
            </mesh>
          </group>
        );
      })}
    </PartGroup>
  );
}

/* ---------------------------------------------------------------------- */
/* brakes: drum shroud + disc + caliper per corner                          */
/* ---------------------------------------------------------------------- */

function Brakes(part: Omit<PartGroupProps, "children" | "mats">) {
  const mats = useMats([
    { c: "#3d3d44", m: 0.9, r: 0.32 },
    { c: RED, m: 0.4, r: 0.4 },
    { c: DARK, m: 0.3, r: 0.6 },
  ]);
  const [disc, caliper, drum] = mats;
  return (
    <PartGroup {...part} mats={mats}>
      {CORNERS.map(([fx, sz]) => (
        <BrakeCorner
          key={`${fx}${sz}`}
          fx={fx}
          sz={sz}
          explodeRef={part.explodeRef}
          disc={disc}
          caliper={caliper}
          drum={drum}
        />
      ))}
    </PartGroup>
  );
}

function BrakeCorner({
  fx,
  sz,
  explodeRef,
  disc,
  caliper,
  drum,
}: {
  fx: number;
  sz: number;
  explodeRef: React.MutableRefObject<number>;
  disc: THREE.MeshStandardMaterial;
  caliper: THREE.MeshStandardMaterial;
  drum: THREE.MeshStandardMaterial;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    g.current?.position.set(fx, 0.36, sz * (0.72 + 0.42 * explodeRef.current));
  });
  return (
    <group ref={g}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={drum}>
        <cylinderGeometry args={[0.21, 0.21, 0.2, 24, 1, true]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={disc}>
        <cylinderGeometry args={[0.18, 0.18, 0.045, 24]} />
      </mesh>
      <mesh position={[0.12, -0.09, 0]} rotation={[0, 0, -0.5]} material={caliper}>
        <boxGeometry args={[0.14, 0.09, 0.06]} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/* tires: rounded shoulders, covered 18" wheels, compound sidewall rings   */
/* ---------------------------------------------------------------------- */

const COMPOUNDS: Record<TireOpt, { color: string; rings: number }> = {
  soft: { color: "#e8102c", rings: 1 },
  med: { color: "#e8c34a", rings: 2 },
  hard: { color: "#e6e6e8", rings: 3 },
};

function Tires({
  compound,
  ...part
}: { compound: TireOpt } & Omit<PartGroupProps, "children" | "mats">) {
  const mats = useMats([
    { c: RUBBER, m: 0.0, r: 0.94 },
    { c: "#1a1a20", m: 0.95, r: 0.28 },
    { c: GOLD, m: 0.95, r: 0.25 },
  ]);
  const [rubber, cover, gold] = mats;
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COMPOUNDS[compound].color,
        side: THREE.DoubleSide,
      }),
    [compound],
  );
  useEffect(() => () => ringMat.dispose(), [ringMat]);
  return (
    <PartGroup {...part} mats={mats}>
      {CORNERS.map(([fx, sz]) => (
        <WheelCorner
          key={`${fx}${sz}`}
          fx={fx}
          sz={sz}
          width={fx > 0 ? 0.31 : 0.4}
          explodeRef={part.explodeRef}
          rubber={rubber}
          cover={cover}
          gold={gold}
          ringMat={ringMat}
          compound={compound}
        />
      ))}
    </PartGroup>
  );
}

function WheelCorner({
  fx,
  sz,
  width,
  explodeRef,
  rubber,
  cover,
  gold,
  ringMat,
  compound,
}: {
  fx: number;
  sz: number;
  width: number;
  explodeRef: React.MutableRefObject<number>;
  rubber: THREE.MeshStandardMaterial;
  cover: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
  compound: TireOpt;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    g.current?.position.set(fx, 0.36, sz * (0.74 + 0.85 * explodeRef.current));
  });
  const shoulder = 0.028;
  const face = sz * (width / 2 + 0.004);
  const { rings } = COMPOUNDS[compound];
  return (
    <group ref={g}>
      {/* tread band + rounded shoulders */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={rubber}>
        <cylinderGeometry args={[0.36, 0.36, width - 2 * shoulder, 36]} />
      </mesh>
      {[1, -1].map((e) => (
        <mesh key={e} position={[0, 0, e * (width / 2 - shoulder)]} material={rubber}>
          <torusGeometry args={[0.332, shoulder, 12, 36]} />
        </mesh>
      ))}
      {/* sidewall fill */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={rubber}>
        <cylinderGeometry args={[0.335, 0.335, width, 36]} />
      </mesh>
      {/* aero wheel cover with a slim gold trim ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={cover}>
        <cylinderGeometry args={[0.225, 0.225, width + 0.012, 28]} />
      </mesh>
      <mesh position={[0, 0, face + 0.004]} rotation={sz > 0 ? [0, 0, 0] : [0, Math.PI, 0]} material={gold}>
        <ringGeometry args={[0.212, 0.221, 32]} />
      </mesh>
      {/* compound marking: color AND ring count differ */}
      {Array.from({ length: rings }, (_, i) => {
        const r0 = i === 0 ? 0.298 : 0.272 - (i - 1) * 0.024;
        return (
          <mesh
            key={i}
            position={[0, 0, face + 0.004]}
            rotation={sz > 0 ? [0, 0, 0] : [0, Math.PI, 0]}
            material={ringMat}
          >
            <ringGeometry args={[r0, r0 + (i === 0 ? 0.016 : 0.008), 36]} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/* rear wing: cambered mainplane + DRS flap, endplates, swan necks, beam   */
/* ---------------------------------------------------------------------- */

function RearWing({
  level,
  ...part
}: { level: RearWingOpt } & Omit<PartGroupProps, "children" | "mats">) {
  const mats = useMats([
    { c: CARBON, m: 0.7, r: 0.38 },
    { c: RED, paint: true },
  ]);
  const [carbon, red] = mats;
  const flap = useRef<THREE.Group>(null);
  const aoa = level === "hi" ? -0.24 : level === "low" ? -0.07 : -0.15;
  const chord = level === "hi" ? 1.12 : level === "low" ? 0.72 : 1;

  useFrame((_, dt) => {
    if (!flap.current) return;
    const open = useStore.getState().drsOpen;
    flap.current.rotation.z = THREE.MathUtils.damp(
      flap.current.rotation.z,
      open ? -0.85 : 0,
      8,
      dt,
    );
  });

  return (
    <PartGroup {...part} mats={mats}>
      {/* deep-camber mainplane */}
      <WingElement
        chord={0.42}
        span={1.16}
        rise={0.12}
        camber={0.055}
        position={[-2.25, 0.8, 0]}
        angle={aoa}
        scaleX={chord}
        material={carbon}
      />
      {/* DRS flap hinged at its leading edge + actuator pod */}
      <group ref={flap} position={[-2.36, 0.93, 0]}>
        <WingElement
          chord={0.26}
          span={1.12}
          rise={0.07}
          camber={0.03}
          position={[-0.1, 0, 0]}
          scaleX={chord}
          material={carbon}
        />
      </group>
      <mesh position={[-2.34, 1.0, 0]} material={carbon}>
        <boxGeometry args={[0.14, 0.05, 0.07]} />
      </mesh>
      {/* endplates */}
      {[1, -1].map((s) => (
        <RoundedBox
          key={s}
          args={[0.6, 0.46, 0.024]}
          radius={0.05}
          smoothness={4}
          position={[-2.28, 0.82, s * 0.62]}
          material={red}
        />
      ))}
      {/* swan-neck mounts from the engine deck */}
      <Strut from={[-1.85, 0.5, 0.1]} to={[-2.3, 0.96, 0.1]} r={0.02} material={carbon} />
      <Strut from={[-1.85, 0.5, -0.1]} to={[-2.3, 0.96, -0.1]} r={0.02} material={carbon} />
      {/* beam wing above the diffuser exit */}
      <WingElement chord={0.16} span={0.8} rise={0.05} camber={0.02} thick={0.018} position={[-2.18, 0.5, 0]} angle={-0.3} material={carbon} />
      <WingElement chord={0.14} span={0.8} rise={0.04} camber={0.018} thick={0.016} position={[-2.12, 0.58, 0]} angle={-0.34} material={carbon} />
    </PartGroup>
  );
}

/* ------------------------------- car ----------------------------------- */

export interface CarModelProps {
  /** parts respond to hover/click and the exploded view (anatomy scene) */
  selectable?: boolean;
  /** wings/tires reflect the Build-Your-Car config from the store */
  showConfig?: boolean;
  position?: [number, number, number];
  scale?: number;
}

/**
 * The car sits on the ground, so a part exploding downward (the floor) has
 * no room — instead the WHOLE car rises with the explode factor, and the
 * floor drops within that headroom. Net effect: parts separate in mid-air,
 * nothing clips through the garage floor.
 */
const EXPLODE_LIFT = 0.55;

export default function CarModel({
  selectable = false,
  showConfig = false,
  position = [0, 0, 0],
  scale = 1,
}: CarModelProps) {
  const root = useRef<THREE.Group>(null);
  const explodeRef = useRef(0);
  const config = useStore((s) => s.config);
  const fwLevel: FrontWingOpt = showConfig ? config.frontWing : "std";
  const rwLevel: RearWingOpt = showConfig ? config.rearWing : "std";
  const compound: TireOpt = showConfig ? config.tires : "med";

  useFrame((_, dt) => {
    const target = selectable
      ? Math.max(useStore.getState().explodeAmount, scrollBus.explode)
      : 0;
    explodeRef.current = THREE.MathUtils.damp(explodeRef.current, target, 5, dt);
    root.current?.position.setY(position[1] + explodeRef.current * EXPLODE_LIFT);
  });

  const shared = { explodeRef, selectable };

  return (
    <group ref={root} position={position} scale={scale}>
      <Chassis />
      <FrontWing level={fwLevel} id="frontWing" explodeDir={[1.5, 0.15, 0]} {...shared} />
      <Floor id="floor" explodeDir={[0, -0.5, 0]} {...shared} />
      <PowerUnit id="powerUnit" explodeDir={[-0.1, 0.85, 0]} {...shared} />
      <Suspension id="suspension" explodeDir={[0, 0.6, 0]} {...shared} />
      <Brakes id="brakes" explodeDir={[0, 0, 0]} {...shared} />
      <Tires compound={compound} id="tires" explodeDir={[0, 0, 0]} {...shared} />
      <RearWing level={rwLevel} id="rearWing" explodeDir={[-1.3, 0.35, 0]} {...shared} />
    </group>
  );
}
