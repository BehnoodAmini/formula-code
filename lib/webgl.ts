export type GlTier = "unknown" | "high" | "low" | "none";

/**
 * Feature-check WebGL and take a cheap guess at device capability.
 * "none" -> static fallbacks, "low" -> capped DPR / no extras, "high" -> full scene.
 */
export function detectGlTier(): GlTier {
  if (typeof window === "undefined") return "unknown";
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (!gl) return "none";

    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory < 4;
    const lowCores =
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency <= 4;
    const coarseSmall =
      window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 480;

    return lowMemory || lowCores || coarseSmall ? "low" : "high";
  } catch {
    return "none";
  }
}
