export const ROOM = { width: 10, depth: 8, height: 3 } as const;
export const TABLE_HEIGHT = 0.9;
export const CONSOLE_HEIGHT = 1.0;

export type Vec3 = readonly [number, number, number];

export interface ModelPlacement {
  id: string;
  model: string;
  position: Vec3;
  rotationY?: number;
  scale?: number;
}

export const MODEL_NAMES = [
  "safety_goggles",
  "protective_gloves",
  "fire_extinguisher",
  "first_aid_kit",
  "control_button",
  "control_lever",
  "warning_sign",
  "parcel_box",
  "sample_bottle",
  "erlenmeyer_flask",
  "cuvette",
  "turbidimeter",
  "buffer_bottle_ph4",
  "buffer_bottle_ph7",
  "buffer_bottle_ph10",
  "ph_meter",
  "vacuum_filtration",
  "vacuum_pump",
] as const;

/** Model bounding sizes [w, h, d] in metres, from reports/model-validation.json. */
export const MODEL_SIZE: Record<string, Vec3> = {
  safety_goggles: [0.188, 0.086, 0.188],
  protective_gloves: [0.281, 0.026, 0.205],
  fire_extinguisher: [0.228, 0.543, 0.164],
  first_aid_kit: [0.324, 0.212, 0.128],
  control_button: [0.16, 0.092, 0.16],
  control_lever: [0.18, 0.32, 0.12],
  warning_sign: [0.34, 0.89, 0.24],
  parcel_box: [0.41, 0.32, 0.32],
  sample_bottle: [0.1, 0.27, 0.1],
  erlenmeyer_flask: [0.14, 0.24, 0.14],
  cuvette: [0.03, 0.11, 0.03],
  turbidimeter: [0.24, 0.11, 0.11],
  buffer_bottle_ph4: [0.075, 0.15, 0.075],
  buffer_bottle_ph7: [0.075, 0.15, 0.075],
  buffer_bottle_ph10: [0.075, 0.15, 0.075],
  ph_meter: [0.36, 0.4, 0.22],
  vacuum_filtration: [0.32, 0.46, 0.2],
  vacuum_pump: [0.28, 0.21, 0.2],
};

/** Furniture from buildRoom.ts: horizontal surfaces {x0,x1,z0,z1,y}. */
export const SURFACES = {
  table_a: { x0: -2.9, x1: -1.1, z0: 0.6, z1: 1.4, y: TABLE_HEIGHT },
  table_b: { x0: 2.25, x1: 4.05, z0: 0.6, z1: 1.4, y: TABLE_HEIGHT },
  console: { x0: 4.35, x1: 4.95, z0: 0.4, z1: 1.6, y: CONSOLE_HEIGHT },
  shelf_1: { x0: -4.95, x1: -4.55, z0: -1.8, z1: 0.2, y: 1.12 },
  shelf_2: { x0: -4.95, x1: -4.55, z0: -1.8, z1: 0.2, y: 1.72 },
  floor: { x0: -5, x1: 5, z0: -4, z1: 4, y: 0 },
} as const;

export type SurfaceId = keyof typeof SURFACES;

const T = TABLE_HEIGHT;
const C = CONSOLE_HEIGHT;
const SIDE = Math.PI / 2;

export const LAB_LAYOUT: readonly (ModelPlacement & { on: SurfaceId })[] = [
  // Table A: pouring bench (goggles pad front-left, lab flask receives the sample, cuvette is filled from it)
  {
    id: "erlenmeyer",
    model: "erlenmeyer_flask",
    position: [-2.0, T, 1.15],
    on: "table_a",
  },
  {
    id: "cuvette",
    model: "cuvette",
    position: [-1.55, T, 0.95],
    on: "table_a",
  },
  // Table B: analysis bench. Back row: turbidimeter, pH meter, filtration + pump (pump = filtration + 0.36 x,
  // so the hose meets the port). Front row: turbidimeter well pad, calibration buffers.
  {
    id: "turbidimeter",
    model: "turbidimeter",
    position: [2.5, T, 1.2],
    on: "table_b",
  },
  { id: "ph_meter", model: "ph_meter", position: [3.0, T, 1.2], on: "table_b" },
  {
    id: "filtration",
    model: "vacuum_filtration",
    position: [3.45, T, 1.15],
    on: "table_b",
  },
  {
    id: "pump",
    model: "vacuum_pump",
    position: [3.81, T, 1.15],
    on: "table_b",
  },
  {
    id: "buffer_ph4",
    model: "buffer_bottle_ph4",
    position: [2.85, T, 0.8],
    on: "table_b",
  },
  {
    id: "buffer_ph7",
    model: "buffer_bottle_ph7",
    position: [3.0, T, 0.8],
    on: "table_b",
  },
  {
    id: "buffer_ph10",
    model: "buffer_bottle_ph10",
    position: [3.15, T, 0.8],
    on: "table_b",
  },
  // Shelf: safety station
  {
    id: "goggles",
    model: "safety_goggles",
    position: [-4.75, 1.12, -1.3],
    rotationY: SIDE,
    on: "shelf_1",
  },
  {
    id: "gloves",
    model: "protective_gloves",
    position: [-4.75, 1.12, -0.45],
    rotationY: SIDE,
    on: "shelf_1",
  },
  {
    id: "first_aid",
    model: "first_aid_kit",
    position: [-4.75, 1.72, -0.8],
    rotationY: SIDE,
    on: "shelf_2",
  },
  // Floor
  {
    id: "extinguisher",
    model: "fire_extinguisher",
    position: [-4.65, 0, -3.5],
    on: "floor",
  },
  {
    id: "warning",
    model: "warning_sign",
    position: [4.6, 0, 2.1],
    rotationY: -SIDE,
    on: "floor",
  },
  // Delivery: parcel with the water sample, on the floor next to the door (door x -4..-3, z -3.97)
  {
    id: "parcel",
    model: "parcel_box",
    position: [-2.75, 0, -3.55],
    on: "floor",
  },
  // Control console
  // the sample bottle lies inside the parcel until the lid is opened
  {
    id: "sample_bottle",
    model: "sample_bottle",
    position: [-2.75, 0, -3.55],
    on: "floor",
  },
  {
    id: "button",
    model: "control_button",
    position: [4.6, C, 0.75],
    rotationY: -SIDE,
    on: "console",
  },
  {
    id: "lever",
    model: "control_lever",
    position: [4.6, C, 1.25],
    rotationY: -SIDE,
    on: "console",
  },
];

/** Footprint [x0, x1, z0, z1] of a placement, honouring 90-degree rotation and scale. */
export function footprint(p: ModelPlacement): [number, number, number, number] {
  const [w, , d] = MODEL_SIZE[p.model];
  const s = p.scale ?? 1;
  const swap = Math.abs(Math.sin(p.rotationY ?? 0)) > 0.5;
  const hx = ((swap ? d : w) * s) / 2;
  const hz = ((swap ? w : d) * s) / 2;
  const [x, , z] = p.position;
  return [x - hx, x + hx, z - hz, z + hz];
}

export function isInsideRoom([x, y, z]: Vec3): boolean {
  return (
    Math.abs(x) < ROOM.width / 2 &&
    Math.abs(z) < ROOM.depth / 2 &&
    y >= 0 &&
    y < ROOM.height
  );
}

export interface LabZone {
  id: string;
  title: string;
  color: readonly [number, number, number];
  center: readonly [number, number];
  size: readonly [number, number];
  labelPosition: Vec3;
  labelRotationY: number;
  items: readonly string[];
}

export const LAB_ZONES: readonly LabZone[] = [
  {
    id: "safety",
    title: "1. Safety station",
    color: [0.2, 0.5, 0.95],
    center: [-4.5, -0.8],
    size: [0.9, 2.2],
    labelPosition: [-4.93, 2.5, -0.8],
    labelRotationY: -SIDE,
    items: ["goggles", "gloves", "first_aid"],
  },
  {
    id: "chemistry",
    title: "2. Pouring bench",
    color: [0.25, 0.8, 0.4],
    center: [-2, 1],
    size: [2.0, 1.0],
    labelPosition: [-2, 1.95, 1.45],
    labelRotationY: 0,
    items: ["erlenmeyer", "cuvette"],
  },
  {
    id: "analysis",
    title: "3. Analysis bench",
    color: [0.95, 0.8, 0.2],
    center: [3.15, 1],
    size: [2.0, 1.0],
    labelPosition: [3.15, 1.95, 1.45],
    labelRotationY: 0,
    items: [
      "turbidimeter",
      "ph_meter",
      "filtration",
      "pump",
      "buffer_ph4",
      "buffer_ph7",
      "buffer_ph10",
    ],
  },
  {
    id: "controls",
    title: "4. Control console",
    color: [0.95, 0.5, 0.15],
    center: [4.6, 1.3],
    size: [0.8, 2.0],
    labelPosition: [4.93, 2.2, 1.0],
    labelRotationY: SIDE,
    items: ["button", "lever", "warning"],
  },
  {
    id: "emergency",
    title: "Emergency",
    color: [0.9, 0.15, 0.15],
    center: [-4.6, -3.5],
    size: [0.7, 0.7],
    labelPosition: [-4.6, 1.2, -3.93],
    labelRotationY: Math.PI,
    items: ["extinguisher"],
  },
  {
    id: "delivery",
    title: "Delivery",
    color: [0.85, 0.6, 0.3],
    center: [-2.75, -3.5],
    size: [1.0, 0.7],
    labelPosition: [-2.75, 1.3, -3.93],
    labelRotationY: Math.PI,
    items: ["parcel", "sample_bottle"],
  },
  {
    id: "info",
    title: "Instructions",
    color: [0.6, 0.4, 0.95],
    center: [-0.6, 3.6],
    size: [2.0, 0.7],
    labelPosition: [-0.6, 2.7, 3.93],
    labelRotationY: 0,
    items: [],
  },
];

/** Item labels. Items without an entry (info panel) are labelled by their drop zone or screen. */
export const ITEM_LABELS: Record<string, string> = {
  erlenmeyer: "Lab flask 1 L",
  cuvette: "Cuvette",
  turbidimeter: "Turbidimeter",
  ph_meter: "pH / conductivity meter",
  filtration: "Vacuum filtration",
  pump: "Vacuum pump",
  buffer_ph4: "BUFFER pH 4.01",
  buffer_ph7: "BUFFER pH 7.00",
  buffer_ph10: "BUFFER pH 10.01",
  sample_bottle: "Well water sample",
  goggles: "Goggles",
  gloves: "Gloves",
  first_aid: "First aid kit",
  extinguisher: "Fire extinguisher",
  parcel: "Parcel: water sample",
  button: "Start",
  lever: "Lever",
};

export function zoneOf(placementId: string): LabZone | undefined {
  return LAB_ZONES.find((z) => z.items.includes(placementId));
}

export function labelHeight(model: string, scale = 1): number {
  return MODEL_SIZE[model][1] * scale + 0.08;
}
