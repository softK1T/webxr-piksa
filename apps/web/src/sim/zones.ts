import { TABLE_HEIGHT, type Vec3 } from "../scene/labLayout";

export interface DropZone {
  id: string;
  label: string;
  center: Vec3;
  half: Vec3;
  snap: Vec3;
  accepts: readonly string[];
}

const T = TABLE_HEIGHT;

export const DROP_ZONES: readonly DropZone[] = [
  {
    id: "prep_zone",
    label: "Goggles check",
    center: [-2.5, T, 0.45],
    half: [0.28, 0.5, 0.2],
    snap: [-2.5, T + 0.01, 0.45],
    accepts: ["safety_goggles"],
  },
  {
    id: "workbench_zone",
    label: "Place flask here",
    center: [2.5, T, 0.45],
    half: [0.25, 0.5, 0.18],
    snap: [2.5, T + 0.01, 0.45],
    accepts: ["lab_flask"],
  },
  {
    id: "rack_zone",
    label: "Tube into rack",
    center: [-1.9, T, 1.1],
    half: [0.25, 0.5, 0.2],
    snap: [-1.9, T + 0.02, 1.1],
    accepts: ["test_tube"],
  },
];

export function findZone(
  position: Vec3,
  model: string,
  zones: readonly DropZone[] = DROP_ZONES,
): DropZone | null {
  return (
    zones.find(
      (z) =>
        z.accepts.includes(model) &&
        [0, 1, 2].every(
          (i) => Math.abs(position[i] - z.center[i]) <= z.half[i],
        ),
    ) ?? null
  );
}
