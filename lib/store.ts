import { create } from "zustand";
import type { PartId } from "@/lib/carParts";
import type { CarConfig } from "@/lib/lapSim";
import { DEFAULT_CONFIG } from "@/lib/lapSim";
import type { GlTier } from "@/lib/webgl";

export type Theme = "race-night" | "pit-lane";
export type SectionId = "hero" | "skills" | "projects" | "garage" | "contact";
export type GarageMode = "inspect" | "build";

/**
 * Discrete app state only. Continuous per-frame values live in lib/scrollBus.
 * Theme + motion preference mirror themselves onto <html data-*> so CSS reacts
 * without any React involvement.
 */
interface FCState {
  theme: Theme;
  setTheme: (t: Theme) => void;

  reduceMotion: boolean;
  motionExplicit: boolean; // user used the in-app toggle (overrides media query)
  setReduceMotion: (v: boolean, explicit?: boolean) => void;

  glTier: GlTier;
  setGlTier: (t: GlTier) => void;

  introDone: boolean;
  finishIntro: () => void;

  activeSection: SectionId;
  setActiveSection: (s: SectionId) => void;

  garageMode: GarageMode;
  setGarageMode: (m: GarageMode) => void;

  selectedPart: PartId | null;
  selectPart: (p: PartId | null) => void;

  /** 0..1 target for the exploded view (the 3D loop eases toward it) */
  explodeAmount: number;
  setExplodeAmount: (v: number) => void;

  drsOpen: boolean;
  toggleDrs: () => void;

  config: CarConfig;
  setConfigOption: <K extends keyof CarConfig>(key: K, value: CarConfig[K]) => void;
}

function syncDataset(key: "theme" | "motion", value: string | null) {
  if (typeof document === "undefined") return;
  if (value === null) delete document.documentElement.dataset[key];
  else document.documentElement.dataset[key] = value;
}

function initialTheme(): Theme {
  if (typeof document !== "undefined") {
    const t = document.documentElement.dataset.theme;
    if (t === "pit-lane" || t === "race-night") return t;
  }
  return "race-night";
}

export const useStore = create<FCState>()((set, get) => ({
  theme: initialTheme(),
  setTheme: (t) => {
    syncDataset("theme", t);
    try {
      localStorage.setItem("fc-theme", t);
    } catch {}
    set({ theme: t });
  },

  reduceMotion: false,
  motionExplicit: false,
  setReduceMotion: (v, explicit = false) => {
    syncDataset("motion", v ? "reduce" : null);
    if (explicit) {
      try {
        localStorage.setItem("fc-motion", v ? "reduce" : "full");
      } catch {}
    }
    set({ reduceMotion: v, motionExplicit: explicit || get().motionExplicit });
  },

  glTier: "unknown",
  setGlTier: (t) => set({ glTier: t }),

  introDone: false,
  finishIntro: () => set({ introDone: true }),

  activeSection: "hero",
  setActiveSection: (s) => set({ activeSection: s }),

  garageMode: "inspect",
  setGarageMode: (m) => set({ garageMode: m }),

  selectedPart: null,
  selectPart: (p) =>
    set((state) => ({
      selectedPart: p,
      // selecting a part blows the car apart; deselecting keeps the slider value
      explodeAmount: p ? 1 : state.explodeAmount,
    })),

  explodeAmount: 0,
  setExplodeAmount: (v) => set({ explodeAmount: Math.min(1, Math.max(0, v)) }),

  drsOpen: false,
  toggleDrs: () => set((s) => ({ drsOpen: !s.drsOpen })),

  config: DEFAULT_CONFIG,
  setConfigOption: (key, value) =>
    set((s) => ({ config: { ...s.config, [key]: value } })),
}));
