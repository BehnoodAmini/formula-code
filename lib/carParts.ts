export type PartId =
  | "frontWing"
  | "floor"
  | "suspension"
  | "brakes"
  | "tires"
  | "powerUnit"
  | "rearWing";

export interface PartInfo {
  id: PartId;
  code: string;
  name: string;
  tagline: string;
  purpose: string;
  stats: { label: string; value: string }[];
}

/**
 * Copy + metadata for the anatomy explorer. The 3D model, the callout panel
 * and the fallback (no-WebGL) view all read from this single source.
 */
export const PARTS: PartInfo[] = [
  {
    id: "frontWing",
    code: "FW-01",
    name: "Front Wing & Nose",
    tagline: "The first thing the air meets.",
    purpose:
      "Every surface behind the front wing inherits its airflow. It generates roughly a quarter of total downforce, but its real job is conditioning: steering vortices around the front tires and feeding clean air to the floor. Flap angle is the main tool for tuning front/rear balance at a race weekend.",
    stats: [
      { label: "DOWNFORCE SHARE", value: "~28%" },
      { label: "ELEMENTS", value: "4" },
      { label: "FLAP ADJUST", value: "±6°" },
    ],
  },
  {
    id: "floor",
    code: "FL-02",
    name: "Floor & Diffuser",
    tagline: "Where most of the grip actually comes from.",
    purpose:
      "Venturi tunnels under the floor accelerate air to create a low-pressure zone that sucks the car onto the track — ground effect. The diffuser at the rear expands that flow back to ambient pressure; the smoother the expansion, the harder the floor works. It is the single largest downforce device on the car and it is invisible from the grandstand.",
    stats: [
      { label: "DOWNFORCE SHARE", value: "~55%" },
      { label: "RIDE HEIGHT", value: "10–15 mm" },
      { label: "SENSITIVITY", value: "EXTREME" },
    ],
  },
  {
    id: "suspension",
    code: "SU-03",
    name: "Suspension",
    tagline: "An aero platform first, comfort never.",
    purpose:
      "Push-rod actuated wishbones keep the chassis flat so the floor sees a stable ride height — the suspension's primary customer is aerodynamics, not the driver. Kinematics control camber and toe through the corner; stiffness trades kerb compliance against platform stability.",
    stats: [
      { label: "TYPE", value: "PUSH-ROD" },
      { label: "WISHBONES", value: "CARBON" },
      { label: "TRAVEL", value: "~30 mm" },
    ],
  },
  {
    id: "brakes",
    code: "BR-04",
    name: "Brakes",
    tagline: "From 340 km/h to a hairpin in under 120 metres.",
    purpose:
      "Carbon-carbon discs run near 1000 °C and only bite properly when hot. The rear axle is brake-by-wire: an ECU blends hydraulic braking with energy harvesting from the hybrid system, so the pedal feels consistent while the battery recharges under braking.",
    stats: [
      { label: "DISC TEMP", value: "≤1000 °C" },
      { label: "DECELERATION", value: "~5.5 G" },
      { label: "REAR", value: "BY-WIRE" },
    ],
  },
  {
    id: "tires",
    code: "TY-05",
    name: "Tires",
    tagline: "Four contact patches, each the size of a postcard.",
    purpose:
      "The only parts touching the track — every input the car makes goes through them. Softer compounds grip harder but fall apart sooner; each compound has a narrow temperature window where it works at all. Managing that window is half of race strategy.",
    stats: [
      { label: "CONTACT PATCH", value: "4 × A5" },
      { label: "WORKING TEMP", value: "90–110 °C" },
      { label: "COMPOUNDS", value: "S / M / H" },
    ],
  },
  {
    id: "powerUnit",
    code: "PU-06",
    name: "Power Unit",
    tagline: "A 1.6 L V6 hybrid producing ~1000 hp.",
    purpose:
      "A turbocharged V6 paired with electric motors that harvest energy from braking and exhaust heat, then redeploy it for around 160 extra horsepower. Thermal efficiency exceeds 50% — the most efficient combustion engines ever built. Packaging and cooling shape the entire rear bodywork.",
    stats: [
      { label: "OUTPUT", value: "~1000 HP" },
      { label: "EFFICIENCY", value: ">50%" },
      { label: "REDLINE", value: "15,000 RPM" },
    ],
  },
  {
    id: "rearWing",
    code: "RW-07",
    name: "Rear Wing & DRS",
    tagline: "Downforce you can switch off.",
    purpose:
      "The rear wing trades straight-line speed for cornering load. DRS (Drag Reduction System) opens the upper flap on straights, collapsing drag for roughly +15 km/h — then snaps shut the instant the brakes touch, restoring full downforce for the corner.",
    stats: [
      { label: "DRS GAIN", value: "+15 km/h" },
      { label: "ACTUATION", value: "<0.5 s" },
      { label: "LOAD @300", value: "~1000 kg" },
    ],
  },
];

export const PART_BY_ID: Record<PartId, PartInfo> = Object.fromEntries(
  PARTS.map((p) => [p.id, p]),
) as Record<PartId, PartInfo>;
