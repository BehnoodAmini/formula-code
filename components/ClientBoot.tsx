"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { detectGlTier } from "@/lib/webgl";

/**
 * Runs once on the client: WebGL capability probe + motion preference sync.
 * The boot script in layout.tsx already stamped <html data-*> before paint;
 * this mirrors that into the store so JS-driven animation can respect it.
 */
export default function ClientBoot() {
  const setGlTier = useStore((s) => s.setGlTier);
  const setReduceMotion = useStore((s) => s.setReduceMotion);

  useEffect(() => {
    setGlTier(detectGlTier());

    const stored = (() => {
      try {
        return localStorage.getItem("fc-motion");
      } catch {
        return null;
      }
    })();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (stored === "reduce") setReduceMotion(true, true);
    else if (stored === "full") setReduceMotion(false, true);
    else setReduceMotion(mq.matches);

    const onChange = (e: MediaQueryListEvent) => {
      // media query only wins while the user hasn't used the in-app toggle
      if (!useStore.getState().motionExplicit) setReduceMotion(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setGlTier, setReduceMotion]);

  return null;
}
