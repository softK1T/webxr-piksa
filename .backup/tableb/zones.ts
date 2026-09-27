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
    center: [-2.55, T, 0.85],
    half: [0.2, 0.5, 0.15],
    snap: [-2.55, T + 0.01, 0.85],
    accepts: ["safety_goggles"],
  },
  {
    id: "workbench_zone",
    label: "Analyzer inlet",
    center: [2.58, T, 0.84],
    half: [0.18, 0.5, 0.14],
    snap: [2.58, T + 0.01, 0.84],
    accepts: ["lab_flask"],
  },
  {
    id: "rack_zone",
    label: "Tube holder",
    center: [2.05, T, 0.85],
    half: [0.2, 0.5, 0.12],
    snap: [2.05, T + 0.02, 0.85],
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
