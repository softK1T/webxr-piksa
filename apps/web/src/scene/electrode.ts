import { TransformNode, type Scene } from "@babylonjs/core";

export const ELECTRODE_ID = "ph_electrode";

/** Detach the pH meter's electrode into its own grabbable placement (anchor = electrode tip).
 *  The cable and lower LOD copies are hidden (a stretched cable would look broken). */
export function detachElectrode(scene: Scene): TransformNode | null {
  const meter = scene.getTransformNodeByName("place_ph_meter");
  if (!meter || scene.getTransformNodeByName(`place_${ELECTRODE_ID}`))
    return null;
  const meshes = meter.getChildMeshes(false);
  const electrodes = meshes.filter((m) => /Electrode/.test(m.name));
  const main = electrodes.find((m) => /LOD0/.test(m.name)) ?? electrodes[0];
  if (!main) return null;
  for (const m of meshes)
    if (m !== main && /Electrode|Cable/.test(m.name)) m.setEnabled(false);
  main.computeWorldMatrix(true);
  const { minimumWorld: lo, maximumWorld: hi } =
    main.getBoundingInfo().boundingBox;
  const anchor = new TransformNode(`place_${ELECTRODE_ID}`, scene);
  anchor.position.set((lo.x + hi.x) / 2, lo.y, (lo.z + hi.z) / 2);
  const meta = { placementId: ELECTRODE_ID, model: ELECTRODE_ID };
  anchor.metadata = meta;
  main.unfreezeWorldMatrix();
  main.setParent(anchor);
  main.metadata = meta;
  main.isPickable = true;
  return anchor;
}
