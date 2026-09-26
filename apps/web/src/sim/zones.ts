import { TABLE_HEIGHT, type Vec3 } from "../scene/labLayout";

export interface DropZone {
  id: string;
  center: Vec3;
  half: Vec3;
  snap: Vec3;
  accepts: readonly string[];
}

const T = TABLE_HEIGHT;

export const DROP_ZONES: readonly DropZone[] = [
  {
    id: "prep_zone",
    center: [-1.9, T, 0.6],
    half: [0.35, 0.6, 0.3],
    snap: [-1.9, T, 0.6],
    accepts: ["safety_goggles"],
  },
  {
    id: "workbench_zone",
    center: [-2.5, T, 1.1],
    half: [0.35, 0.6, 0.3],
    snap: [-2.5, T, 1.1],
    accepts: ["lab_flask"],
  },
  {
    id: "rack_zone",
    center: [-1.9, T, 1.1],
    half: [0.25, 0.6, 0.2],
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
