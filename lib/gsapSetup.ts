"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * CSS Modules `composes` returns a space-separated class list
 * ("Panel_x corners"), which breaks naive `.${styles.x}` selectors.
 * cssSel("a b") -> ".a.b" — a valid compound selector.
 */
export const cssSel = (classNames: string) =>
  "." + classNames.trim().split(/\s+/).join(".");

export { gsap, ScrollTrigger };
