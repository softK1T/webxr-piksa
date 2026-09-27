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
  "lab_flask",
  "test_tube",
  "test_tube_rack",
  "safety_goggles",
  "protective_gloves",
  "fire_extinguisher",
  "first_aid_kit",
  "measurement_device",
  "control_button",
  "control_lever",
  "colored_container_red",
  "colored_container_blue",
  "colored_container_green",
  "warning_sign",
  "information_panel",
] as const;

/** Model bounding sizes [w, h, d] in metres, from reports/model-validation.json. */
export const MODEL_SIZE: Record<string, Vec3> = {
  lab_flask: [0.2, 0.34, 0.2],
  test_tube: [0.044, 0.184, 0.044],
  test_tube_rack: [0.32, 0.113, 0.1],
  safety_goggles: [0.188, 0.086, 0.188],
  protective_gloves: [0.281, 0.026, 0.205],
  fire_extinguisher: [0.228, 0.543, 0.164],
  first_aid_kit: [0.324, 0.212, 0.128],
  measurement_device: [0.394, 0.254, 0.22],
  control_button: [0.16, 0.092, 0.16],
  control_lever: [0.18, 0.32, 0.12],
  colored_container_red: [0.28, 0.27, 0.2],
  colored_container_blue: [0.28, 0.27, 0.2],
  colored_container_green: [0.28, 0.27, 0.2],
  warning_sign: [0.34, 0.89, 0.24],
  information_panel: [0.8, 0.65, 0.16],
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
  // five identical samples on the sample bench; only the label tells them apart
  { id: "flask", model: "lab_flask", position: [-2.7, T, 1.25], on: "table_a" },
  {
    id: "flask_2",
    model: "lab_flask",
    position: [-2.35, T, 1.25],
    on: "table_a",
  },
  {
    id: "flask_3",
    model: "lab_flask",
    position: [-2.0, T, 1.25],
    on: "table_a",
  },
  {
    id: "flask_4",
    model: "lab_flask",
    position: [-1.65, T, 1.25],
    on: "table_a",
  },
  {
    id: "flask_5",
    model: "lab_flask",
    position: [-1.3, T, 1.25],
    on: "table_a",
  },
  // Table A: sample bench (goggles pad at left front, flask middle, rack right back)
  {
    id: "rack",
    model: "test_tube_rack",
    position: [3.2, T, 0.85],
    on: "table_b",
  },
  { id: "tube", model: "test_tube", position: [2.87, T, 0.72], on: "table_b" },
  // Table B: analysis bench (containers in back row, device right, flask pad in front of device)
  {
    id: "container_red",
    model: "colored_container_red",
    position: [2.5, T, 1.2],
    on: "table_b",
  },
  {
    id: "container_blue",
    model: "colored_container_blue",
    position: [2.85, T, 1.2],
    on: "table_b",
  },
  {
    id: "container_green",
    model: "colored_container_green",
    position: [3.2, T, 1.2],
    on: "table_b",
  },
  {
    id: "device",
    model: "measurement_device",
    position: [3.73, T, 1.2],
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
  {
    id: "info_panel",
    model: "information_panel",
    position: [0, 0, 3.8],
    rotationY: Math.PI,
    scale: 2,
    on: "floor",
  },
  // Control console
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
    title: "2. Sample bench",
    color: [0.25, 0.8, 0.4],
    center: [-2, 1],
    size: [2.0, 1.0],
    labelPosition: [-2, 1.95, 1.45],
    labelRotationY: 0,
    items: ["flask", "flask_2", "flask_3", "flask_4", "flask_5"],
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
      "device",
      "container_red",
      "container_blue",
      "container_green",
      "rack",
      "tube",
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
    id: "info",
    title: "Instructions",
    color: [0.6, 0.4, 0.95],
    center: [0, 3.6],
    size: [2.0, 0.7],
    labelPosition: [0, 2.7, 3.93],
    labelRotationY: 0,
    items: ["info_panel"],
  },
];

/** Item labels. Items without an entry (rack, info panel) are labelled by their drop zone or screen. */
export const ITEM_LABELS: Record<string, string> = {
  flask: "Sample No. 7",
  flask_2: "Sample No. 3",
  flask_3: "Sample No. 5",
  flask_4: "Sample No. 8",
  flask_5: "Sample No. 9",
  tube: "Test tube",
  device: "Measurement device",
  container_red: "ACID  pH 1",
  container_blue: "NEUTRAL BUFFER  pH 7",
  container_green: "ALKALINE  pH 12",
  goggles: "Goggles",
  gloves: "Gloves",
  first_aid: "First aid kit",
  extinguisher: "Fire extinguisher",
  button: "Start",
  lever: "Lever",
};

export function zoneOf(placementId: string): LabZone | undefined {
  return LAB_ZONES.find((z) => z.items.includes(placementId));
}

export function labelHeight(model: string, scale = 1): number {
  return MODEL_SIZE[model][1] * scale + 0.08;
}
