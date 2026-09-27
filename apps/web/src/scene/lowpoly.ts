import {
  Mesh,
  StandardMaterial,
  PBRMaterial,
  type AbstractMesh,
  type Scene,
} from "@babylonjs/core";

/** Meshes above this vertex count are too dense to read as faceted low-poly. */
export const MAX_FACETED_VERTICES = 6000;
const SKIP =
  /^(floor|ceiling|wall_|range_(floor|ceiling|wall|backstop|line|hole|target)|foam|blaster_tracer|label|zone_|drop_|lamp_tube)/;

export function shouldFacet(
  name: string,
  vertices: number,
  hasInstances: boolean,
): boolean {
  return (
    !SKIP.test(name) &&
    vertices > 0 &&
    vertices <= MAX_FACETED_VERTICES &&
    !hasInstances
  );
}

/**
 * Low-poly look: split shared vertices so every triangle gets its own flat normal
 * (each facet catches light as one solid tone), and drop glossy, smooth-looking specular.
 */
export function applyLowPolyStyle(scene: Scene) {
  const done = new WeakSet<AbstractMesh>();
  const facet = (m: AbstractMesh) => {
    if (done.has(m) || !(m instanceof Mesh) || m.getClassName() !== "Mesh")
      return;
    if (!shouldFacet(m.name, m.getTotalVertices(), m.instances.length > 0))
      return;
    done.add(m);
    const frozen = m.isWorldMatrixFrozen;
    if (frozen) m.unfreezeWorldMatrix();
    m.convertToFlatShadedMesh();
    if (frozen) m.freezeWorldMatrix();
    const mat = m.material;
    if (mat instanceof StandardMaterial) {
      if (mat.isFrozen) mat.unfreeze();
      mat.specularPower = Math.min(mat.specularPower, 24);
      mat.specularColor.scaleInPlace(0.5);
    } else if (mat instanceof PBRMaterial) {
      if (mat.isFrozen) mat.unfreeze();
      mat.roughness = Math.max(mat.roughness ?? 0.6, 0.6);
    }
  };
  scene.meshes.forEach(facet);
  const obs = scene.onNewMeshAddedObservable.add((m) =>
    window.setTimeout(() => facet(m), 0),
  );
  return { dispose: () => scene.onNewMeshAddedObservable.remove(obs) };
}
