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

    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };

    // Only downgrade on signals the browser ACTUALLY reports. iOS Safari
    // never exposes deviceMemory, so a missing value must not read as "weak"
    // — treating small touchscreens as low-end was pinning every phone,
    // iPhone Pros included, to the procedural base model.
    const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory < 4;
    const lowCores =
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency <= 2;
    const saveData = nav.connection?.saveData === true;

    // WebGL2 is a reasonable "modern GPU + driver" floor. Anything WebGL1-only
    // today is old enough to want the lighter scene; everything current
    // (including every iPhone since ~2021) reports WebGL2.
    const noWebGL2 =
      typeof WebGL2RenderingContext === "undefined" ||
      !(gl instanceof WebGL2RenderingContext);

    return lowMemory || lowCores || saveData || noWebGL2 ? "low" : "high";
  } catch {
    return "none";
  }
}
