"use client";

import { useEffect, useState, type RefObject } from "react";
import { useStore, type SectionId } from "@/lib/store";

/** Marks the section active (for nav highlighting) when it crosses mid-viewport. */
export function useSectionSpy(id: SectionId, ref: RefObject<HTMLElement | null>) {
  const setActiveSection = useStore((s) => s.setActiveSection);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveSection(id);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, ref, setActiveSection]);
}

/**
 * True while el is within `margin` of the viewport. Used to lazy-mount the
 * anatomy mini-app and to pause canvas frameloops when far off-screen.
 */
export function useNearViewport(
  ref: RefObject<HTMLElement | null>,
  margin = "600px",
) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}
