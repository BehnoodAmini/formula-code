"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollBus } from "@/lib/scrollBus";
import { useStore } from "@/lib/store";

/**
 * The read side of the GSAP <-> r3f contract. ScrollTrigger writes
 * scrollBus.hero / scrollBus.intro; this rig converts them into an orbit
 * around the car every frame and eases toward it. GSAP never touches the
 * camera, r3f never reads the DOM — the bus is the only meeting point.
 */

const easeInOut = (t: number) => t * t * (3 - 2 * t);
const lerp = THREE.MathUtils.lerp;

const INTRO_POS = new THREE.Vector3(9.6, 0.6, 2.0);

export default function CameraRig() {
  const target = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3(1.2, 0.5, 0));
  const lookTarget = useRef(new THREE.Vector3());

  useFrame(({ camera }, dt) => {
    const { reduceMotion, introDone } = useStore.getState();
    const h = reduceMotion ? 0.35 : easeInOut(scrollBus.hero);

    // scroll orbit: low front three-quarter (reference-photo pose) ->
    // elevated side profile
    const theta = lerp(0.52, 1.8, h);
    const radius = lerp(7.4, 8.2, h);
    const height = lerp(1.05, 2.7, h);
    target.current.set(
      Math.cos(theta) * radius,
      height,
      Math.sin(theta) * radius,
    );
    lookTarget.current.set(lerp(0.5, 0, h), 0.45, 0);

    // engine-start dolly blends into the scroll pose
    if (!introDone && !reduceMotion) {
      const i = easeInOut(scrollBus.intro);
      target.current.lerpVectors(INTRO_POS, target.current, i);
    }

    // pointer parallax
    if (!reduceMotion) {
      target.current.x += scrollBus.pointerX * 0.35;
      target.current.y += scrollBus.pointerY * 0.2;
      target.current.z += scrollBus.pointerX * 0.15;
    }

    const smooth = 1 - Math.exp(-4.5 * dt);
    camera.position.lerp(target.current, smooth);
    look.current.lerp(lookTarget.current, smooth);
    camera.lookAt(look.current);
  });

  return null;
}
