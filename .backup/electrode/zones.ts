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
    id: "turbidimeter_socket",
    label: "Turbidimeter well",
    // the cell well under the lid at the back of the housing (turbidimeter.glb: Lid at z -0.097)
    center: [2.5, T, 1.15],
    half: [0.13, 0.5, 0.13],
    snap: [2.5, T + 0.03, 1.103],
    accepts: ["cuvette"],
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
