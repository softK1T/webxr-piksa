import {
  type AbstractMesh,
  Color3,
  DynamicTexture,
  MeshBuilder,
  type Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { SAMPLE_FLASKS } from "../sim/scenario";
import { placementOf } from "../xr/selection";

/** Small paper tag on each flask; many face away, so you have to pick flasks up. */
export function mountSampleTags(scene: Scene) {
  const headless =
    typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
  const best = new Map<string, AbstractMesh>();
  const size = (m: AbstractMesh) =>
    m.getBoundingInfo().boundingBox.extendSizeWorld.length();
  for (const m of scene.meshes) {
    const p = placementOf(m);
    if (!p || p.model !== "lab_flask" || !m.getTotalVertices()) continue;
    const cur = best.get(p.placementId);
    if (!cur || size(m) > size(cur)) best.set(p.placementId, m);
  }
  const tags = SAMPLE_FLASKS.flatMap((f, i) => {
    const mesh = best.get(f.id);
    if (!mesh) return [];
    const tag = MeshBuilder.CreatePlane(
      `label_tag_${f.id}`,
      { width: 0.045, height: 0.028 },
      scene,
    );
    const mat = new StandardMaterial(`M_Tag_${f.id}`, scene);
    mat.backFaceCulling = true;
    mat.emissiveColor = new Color3(0.45, 0.45, 0.42);
    if (!headless) {
      const t = new DynamicTexture(
        `tag_tex_${f.id}`,
        { width: 128, height: 80 },
        scene,
        true,
      );
      const c = t.getContext() as unknown as CanvasRenderingContext2D;
      c.fillStyle = "#efe9da";
      c.fillRect(0, 0, 128, 80);
      c.fillStyle = "#222";
      c.font = "bold 44px sans-serif";
      c.textAlign = "center";
      c.fillText(`No.${f.no}`, 64, 56);
      t.update();
      mat.diffuseTexture = t;
    }
    tag.material = mat;
    tag.isPickable = false;
    tag.metadata = { dynamic: true };
    // fixed direction per flask; most tags do not face the room
    const a = [2.6, 0.4, 3.9, 1.6, 5.2][i % 5];
    return [{ mesh, tag, local: new Vector3(Math.cos(a), 0, Math.sin(a)) }];
  });
  const obs = scene.onBeforeRenderObservable.add(() => {
    for (const { mesh, tag, local } of tags) {
      if (mesh.isDisposed()) continue;
      const bb = mesh.getBoundingInfo().boundingBox;
      const dir = Vector3.TransformNormal(local, mesh.getWorldMatrix());
      dir.y = 0;
      if (dir.lengthSquared() < 1e-6) continue;
      dir.normalize();
      const r = Math.min(bb.extendSizeWorld.x, bb.extendSizeWorld.z);
      tag.position.copyFrom(bb.centerWorld).addInPlace(dir.scale(r + 0.003));
      tag.position.y = bb.minimumWorld.y + bb.extendSizeWorld.y * 0.6;
      tag.lookAt(tag.position.add(dir)); // front (-Z) faces outward
      tag.rotate(Vector3.Up(), Math.PI);
    }
  });
  return {
    dispose: () => {
      scene.onBeforeRenderObservable.remove(obs);
      tags.forEach((t) => t.tag.dispose());
    },
  };
}
