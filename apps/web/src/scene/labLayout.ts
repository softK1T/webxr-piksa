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

const T = TABLE_HEIGHT;

export const LAB_LAYOUT: readonly ModelPlacement[] = [
  { id: "flask", model: "lab_flask", position: [-2.45, T, 0.95] },
  { id: "rack", model: "test_tube_rack", position: [-1.9, T, 1.1] },
  { id: "tube", model: "test_tube", position: [-1.4, T, 0.8] },
  { id: "device", model: "measurement_device", position: [2.5, T, 0.9] },
  {
    id: "container_red",
    model: "colored_container_red",
    position: [1.35, T, 1.15],
  },
  {
    id: "container_blue",
    model: "colored_container_blue",
    position: [1.7, T, 0.7],
  },
  {
    id: "container_green",
    model: "colored_container_green",
    position: [2.05, T, 1.2],
  },
  {
    id: "goggles",
    model: "safety_goggles",
    position: [-4.72, 1.12, -1.2],
    rotationY: Math.PI / 2,
  },
  {
    id: "gloves",
    model: "protective_gloves",
    position: [-4.72, 1.12, -0.4],
    rotationY: Math.PI / 2,
  },
  {
    id: "first_aid",
    model: "first_aid_kit",
    position: [-4.72, 1.72, -0.8],
    rotationY: Math.PI / 2,
  },
  { id: "extinguisher", model: "fire_extinguisher", position: [-4.5, 0, -3.5] },
  {
    id: "button",
    model: "control_button",
    position: [4.4, CONSOLE_HEIGHT, 0.7],
    rotationY: -Math.PI / 2,
  },
  {
    id: "lever",
    model: "control_lever",
    position: [4.4, CONSOLE_HEIGHT, 1.3],
    rotationY: -Math.PI / 2,
  },
  {
    id: "warning",
    model: "warning_sign",
    position: [1.75, 0, 3.55],
    rotationY: Math.PI,
  },
  {
    id: "info_panel",
    model: "information_panel",
    position: [0, 0, 3.6],
    rotationY: Math.PI,
    scale: 2,
  },
];

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
    center: [-4.45, -0.8],
    size: [1.0, 2.0],
    labelPosition: [-4.9, 2.3, -0.8],
    labelRotationY: -Math.PI / 2,
    items: ["goggles", "gloves", "first_aid"],
  },
  {
    id: "chemistry",
    title: "2. Sample bench",
    color: [0.25, 0.8, 0.4],
    center: [-1.9, 1.0],
    size: [2.2, 1.4],
    labelPosition: [-1.9, 2.0, 1.75],
    labelRotationY: 0,
    items: ["flask", "rack", "tube"],
  },
  {
    id: "analysis",
    title: "3. Analysis bench",
    color: [0.95, 0.8, 0.2],
    center: [1.9, 1.0],
    size: [2.2, 1.4],
    labelPosition: [1.9, 2.0, 1.75],
    labelRotationY: 0,
    items: ["device", "container_red", "container_blue", "container_green"],
  },
  {
    id: "controls",
    title: "4. Control console",
    color: [0.95, 0.5, 0.15],
    center: [4.35, 1.0],
    size: [1.0, 1.4],
    labelPosition: [4.9, 2.2, 1.0],
    labelRotationY: Math.PI / 2,
    items: ["button", "lever"],
  },
  {
    id: "emergency",
    title: "Emergency",
    color: [0.9, 0.15, 0.15],
    center: [-4.4, -3.4],
    size: [1.0, 1.0],
    labelPosition: [-4.4, 1.5, -3.9],
    labelRotationY: Math.PI,
    items: ["extinguisher"],
  },
  {
    id: "info",
    title: "Instructions",
    color: [0.6, 0.4, 0.95],
    center: [0, 3.5],
    size: [4.2, 0.9],
    labelPosition: [0, 2.65, 3.9],
    labelRotationY: Math.PI,
    items: ["info_panel", "warning"],
  },
];

export const ITEM_LABELS: Record<string, string> = {
  flask: "Flask",
  rack: "Tube rack",
  tube: "Test tube",
  device: "Measurement device",
  container_red: "Red",
  container_blue: "Blue",
  container_green: "Green",
  goggles: "Goggles",
  gloves: "Gloves",
  first_aid: "First aid kit",
  extinguisher: "Fire extinguisher",
  button: "Start button",
  lever: "Lever",
  warning: "Caution",
};

export function zoneOf(placementId: string): LabZone | undefined {
  return LAB_ZONES.find((z) => z.items.includes(placementId));
}
