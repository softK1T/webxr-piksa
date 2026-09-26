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
  { id: "flask", model: "lab_flask", position: [-4.72, 1.72, -1.4] },
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
    position: [4.3, 0, 3.4],
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
