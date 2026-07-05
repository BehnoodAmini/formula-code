/**
 * The "Build Your Car" lap simulation.
 *
 * Shared by the client (live telemetry readout) AND the leaderboard API route:
 * the server re-computes the lap time from the submitted config, so a client
 * can never post a fabricated time. Keeping this in /lib (plain TS, no React,
 * no Node APIs) is what makes that sharing free.
 *
 * Model: each option contributes straight-line points and cornering points.
 * A lap of the fictional "Circuito del Codice" starts from a base time and
 * each point buys time back. Two interaction terms create actual depth:
 *  - aero imbalance: mismatched front/rear wing load scrubs time,
 *  - suspension/tire coupling: stiffness only pays off on the right compound.
 */

export type FrontWingOpt = "hi" | "std" | "low";
export type RearWingOpt = "hi" | "std" | "low";
export type PowerUnitOpt = "quali" | "std" | "endur";
export type SuspensionOpt = "stiff" | "std" | "soft";
export type TireOpt = "soft" | "med" | "hard";

export interface CarConfig {
  frontWing: FrontWingOpt;
  rearWing: RearWingOpt;
  powerUnit: PowerUnitOpt;
  suspension: SuspensionOpt;
  tires: TireOpt;
}

export interface OptionDef {
  id: string;
  label: string;
  /** 1–2 char code shown inside the option's icon (never color alone) */
  short: string;
  /** icon shape drawn next to the label — a second non-color channel */
  shape: "wedge" | "bar" | "ring" | "coil" | "dot";
  desc: string;
  straight: number;
  corner: number;
  /** aero load contribution (wings only) used for the imbalance penalty */
  aero?: number;
}

export const SETUP_CATEGORIES: {
  key: keyof CarConfig;
  label: string;
  options: OptionDef[];
}[] = [
  {
    key: "frontWing",
    label: "FRONT WING",
    options: [
      { id: "hi", label: "High downforce", short: "HD", shape: "wedge", straight: -0.6, corner: 1.5, aero: 2, desc: "Steep flaps. Bites in corners, drags on straights." },
      { id: "std", label: "Balanced", short: "BA", shape: "wedge", straight: 0, corner: 0.9, aero: 1, desc: "The Wednesday-simulator compromise." },
      { id: "low", label: "Low drag", short: "LD", shape: "wedge", straight: 0.9, corner: 0.2, aero: 0, desc: "Skinny flaps. Slippery, but the front washes wide." },
    ],
  },
  {
    key: "rearWing",
    label: "REAR WING",
    options: [
      { id: "hi", label: "High downforce", short: "HD", shape: "bar", straight: -0.8, corner: 1.4, aero: 2, desc: "A barn door. Monaco spec." },
      { id: "std", label: "Balanced", short: "BA", shape: "bar", straight: 0, corner: 0.85, aero: 1, desc: "Works almost everywhere." },
      { id: "low", label: "Skinny", short: "SK", shape: "bar", straight: 1.0, corner: 0.15, aero: 0, desc: "Monza spec. Pray in the corners." },
    ],
  },
  {
    key: "powerUnit",
    label: "POWER UNIT MODE",
    options: [
      { id: "quali", label: "Qualifying", short: "Q", shape: "ring", straight: 2.2, corner: 0, desc: "Full deployment, party mode. One lap of glory." },
      { id: "std", label: "Standard", short: "S", shape: "ring", straight: 1.4, corner: 0.2, desc: "Sustainable pace, balanced harvest." },
      { id: "endur", label: "Endurance", short: "E", shape: "ring", straight: 0.8, corner: 0.5, desc: "Lift-and-coast. Wins races, not leaderboards." },
    ],
  },
  {
    key: "suspension",
    label: "SUSPENSION",
    options: [
      { id: "stiff", label: "Stiff", short: "ST", shape: "coil", straight: 0.2, corner: 1.6, desc: "Razor platform. Needs grip underneath it." },
      { id: "std", label: "Balanced", short: "BA", shape: "coil", straight: 0.1, corner: 1.0, desc: "Predictable over kerbs and bumps." },
      { id: "soft", label: "Soft", short: "SO", shape: "coil", straight: 0, corner: 0.7, desc: "Compliant. Rescues low-grip setups." },
    ],
  },
  {
    key: "tires",
    label: "TIRE COMPOUND",
    options: [
      { id: "soft", label: "Soft — C5", short: "S", shape: "dot", straight: 0, corner: 2.2, desc: "Maximum grip, melts by lap 12." },
      { id: "med", label: "Medium — C3", short: "M", shape: "dot", straight: 0.2, corner: 1.2, desc: "The strategist's default." },
      { id: "hard", label: "Hard — C1", short: "H", shape: "dot", straight: 0.4, corner: 0.4, desc: "Runs forever. Feels like it, too." },
    ],
  },
];

export const DEFAULT_CONFIG: CarConfig = {
  frontWing: "std",
  rearWing: "std",
  powerUnit: "std",
  suspension: "std",
  tires: "med",
};

export interface SimResult {
  lapMs: number;
  topSpeed: number; // km/h
  grip: number; // peak lateral G
  balance: string; // human-readable setup verdict
}

const BASE_LAP_MS = 94_500;
const STRAIGHT_MS = 420;
const CORNER_MS = 520;
const IMBALANCE_MS = 380;

function opt(key: keyof CarConfig, id: string): OptionDef {
  const cat = SETUP_CATEGORIES.find((c) => c.key === key)!;
  return cat.options.find((o) => o.id === id) ?? cat.options[1];
}

export function isValidConfig(c: unknown): c is CarConfig {
  if (typeof c !== "object" || c === null) return false;
  const cfg = c as Record<string, unknown>;
  return SETUP_CATEGORIES.every(
    (cat) =>
      typeof cfg[cat.key] === "string" &&
      cat.options.some((o) => o.id === cfg[cat.key]),
  );
}

export function simulate(config: CarConfig): SimResult {
  const fw = opt("frontWing", config.frontWing);
  const rw = opt("rearWing", config.rearWing);
  const pu = opt("powerUnit", config.powerUnit);
  const su = opt("suspension", config.suspension);
  const ty = opt("tires", config.tires);

  let straight = fw.straight + rw.straight + pu.straight + su.straight + ty.straight;
  let corner = fw.corner + rw.corner + pu.corner + su.corner + ty.corner;

  // Interaction 1: aero imbalance. A high-load front with a skinny rear (or
  // vice versa) makes the car either understeer or snap — costs lap time.
  const imbalance = Math.abs((fw.aero ?? 0) - (rw.aero ?? 0));

  // Interaction 2: suspension stiffness needs mechanical grip to lean on.
  let coupling = 0;
  if (config.suspension === "stiff" && config.tires === "soft") coupling = 0.5;
  if (config.suspension === "stiff" && config.tires === "hard") coupling = -0.6;
  if (config.suspension === "soft" && config.tires === "hard") coupling = 0.4;
  corner += coupling;

  const lapMs = Math.round(
    BASE_LAP_MS - straight * STRAIGHT_MS - corner * CORNER_MS + imbalance * IMBALANCE_MS,
  );

  const balance =
    imbalance >= 2
      ? "AERO IMBALANCE — car is fighting itself"
      : coupling < 0
        ? "PLATFORM SKATING — stiff springs, no grip"
        : corner > 6.5
          ? "HOOKED UP — maximum attack"
          : straight > 3
            ? "SLIPPERY — a rocket in a straight line"
            : "NEUTRAL — tidy and driveable";

  return {
    lapMs,
    topSpeed: Math.round(318 + straight * 6),
    grip: Math.round((3.1 + corner * 0.25) * 100) / 100,
    balance,
  };
}

export const BASELINE = simulate(DEFAULT_CONFIG);

/** 90420 -> "1:30.420" */
export function formatLap(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const t = Math.round(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(t).padStart(3, "0")}`;
}

/** signed delta in seconds: "+0.312" / "-0.204" */
export function formatDelta(ms: number): string {
  const sign = ms >= 0 ? "+" : "−";
  return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}`;
}
