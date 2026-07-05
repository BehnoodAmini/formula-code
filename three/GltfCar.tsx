"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF, useTexture } from "@react-three/drei";

/**
 * The hero's photoreal car: "Formula 1 mesh" by Dil Afroze Ahmad (free model,
 * used with attribution — see README). Prepared by scripts/prepare-car-assets:
 * OBJ -> quantized GLB, plus a DE-BRANDED livery generated from the original
 * texture (the source diffuse replicates Ferrari's sponsor livery, which this
 * site deliberately doesn't ship — swap LIVERY below to the original PNG only
 * for private use).
 *
 * The mesh is one merged object (three material slots), so it can't do the
 * exploded anatomy view — the garage keeps the procedural schematic twin.
 */

const MODEL = "/models/f1-car.glb";
/**
 * NEXT_PUBLIC_CAR_LIVERY=original (set in .env.local, which is gitignored)
 * switches to the model's original replica livery — Ferrari/sponsor
 * trademarks included, so keep that flavor to private builds only.
 * Default (unset) is the de-branded two-tone livery, safe to deploy.
 */
const LIVERY = "/models/tex/livery-original.webp";
  // process.env.NEXT_PUBLIC_CAR_LIVERY === "original"
  //   ? "/models/tex/livery-original.webp"
  //   : "/models/tex/livery.webp";
const NORMAL = "/models/tex/normal.webp";
const ROUGHNESS = "/models/tex/roughness.webp";

/** flip because the source mesh's nose points -X after normalization */
const FACING_FLIP = Math.PI; // radians added to yaw
const TARGET_LENGTH = 5.3;

export default function GltfCar({
  position = [0, 0, 0] as [number, number, number],
}) {
  const { scene } = useGLTF(MODEL);
  const [livery, normal, roughness] = useTexture([LIVERY, NORMAL, ROUGHNESS]);

  const { root, materials } = useMemo(() => {
    livery.colorSpace = THREE.SRGBColorSpace;
    for (const t of [livery, normal, roughness]) {
      t.flipY = false; // glTF UV convention
      t.needsUpdate = true;
    }

    const paint = new THREE.MeshPhysicalMaterial({
      map: livery,
      normalMap: normal,
      // full-strength baked normals draw streaky contour lines across the
      // smooth bodywork under clearcoat — keep just a hint of panel detail
      normalScale: new THREE.Vector2(0.25, 0.25),
      roughnessMap: roughness,
      metalness: 0.3,
      roughness: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
    });
    const mirror = new THREE.MeshStandardMaterial({
      color: "#c9c9d2",
      metalness: 1,
      roughness: 0.08,
    });
    const filler = new THREE.MeshStandardMaterial({
      color: "#0a0a0c",
      metalness: 0.2,
      roughness: 0.7,
    });

    const car = scene.clone(true);
    car.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const name = (
          (o.material as THREE.Material | undefined)?.name ?? ""
        ).toLowerCase();
        o.material = name.includes("mirror")
          ? mirror
          : name.includes("filler")
            ? filler
            : paint;
      }
    });

    // normalize: length along X, uniform scale to TARGET_LENGTH, wheels on y=0
    const group = new THREE.Group();
    group.add(car);
    let box = new THREE.Box3().setFromObject(group);
    let size = box.getSize(new THREE.Vector3());
    const yaw = (size.z > size.x ? Math.PI / 2 : 0) + FACING_FLIP;
    group.rotation.y = yaw;
    const k = TARGET_LENGTH / Math.max(size.x, size.z);
    // mirror across Z: the source model UV-maps only its left side (sponsor
    // text mirrors on the right), and the hero camera orbits the +Z side —
    // flipping shows the correctly-mapped side. three.js handles the
    // negative-determinant winding automatically.
    group.scale.set(k, k, -k);
    group.updateWorldMatrix(true, true);
    box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.set(-center.x, -box.min.y, -center.z);

    const holder = new THREE.Group();
    holder.add(group);
    return { root: holder, materials: [paint, mirror, filler] };
  }, [scene, livery, normal, roughness]);

  useEffect(
    () => () => materials.forEach((m) => m.dispose()),
    [materials],
  );

  return <primitive object={root} position={position} />;
}

useGLTF.preload(MODEL);
