import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  type Scene,
  type TransformNode,
} from "@babylonjs/core";
import {
  ITEM_LABELS,
  LAB_LAYOUT,
  LAB_ZONES,
  ROOM,
  zoneOf,
  type Vec3,
} from "./labLayout";
import { DROP_ZONES } from "../sim/zones";

export const LABEL_PREFIX = "label_";
export const ZONE_PREFIX = "zone_";
export const DROP_PREFIX = "drop_";

export function createLabel(
  scene: Scene,
  name: string,
  text: string,
  position: Vec3,
  rotationY: number,
  { height = 0.12, accent = [1, 1, 1] as readonly number[] } = {},
): Mesh {
  const aspect = Math.max(2, text.length * 0.55);
  const plane = MeshBuilder.CreatePlane(
    LABEL_PREFIX + name,
    { width: height * aspect, height, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  plane.position.set(...position);
  plane.rotation.y = rotationY;
  plane.isPickable = false;
  const mat = new StandardMaterial(`${LABEL_PREFIX}${name}_mat`, scene);
  mat.disableLighting = true;
  mat.emissiveColor = Color3.White();
  mat.backFaceCulling = false;
  const headless =
    typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
  if (!headless)
    try {
      const texture = new DynamicTexture(
        `${LABEL_PREFIX}${name}_tex`,
        { width: Math.round(128 * aspect), height: 128 },
        scene,
        true,
      );
      const ctx = texture.getContext();
      ctx.fillStyle = "rgba(20,24,30,0.9)";
      ctx.fillRect(0, 0, 128 * aspect, 128);
      ctx.fillStyle = `rgb(${accent.map((c) => Math.round(c * 255)).join(",")})`;
      ctx.fillRect(0, 0, 128 * aspect, 10);
      texture.drawText(
        text,
        null,
        88,
        "bold 64px sans-serif",
        "white",
        null,
        true,
      );
      texture.hasAlpha = true;
      mat.diffuseTexture = texture;
      mat.emissiveTexture = texture;
      mat.useAlphaFromDiffuseTexture = true;
    } catch {
      mat.emissiveColor = new Color3(0.9, 0.9, 0.9);
    }
  plane.material = mat;
  return plane;
}

export function dressLab(scene: Scene): void {
  for (const zone of LAB_ZONES) {
    const [w, d] = zone.size;
    const floor = MeshBuilder.CreateGround(
      ZONE_PREFIX + zone.id,
      { width: w, height: d },
      scene,
    );
    floor.position.set(zone.center[0], 0.004, zone.center[1]);
    floor.isPickable = false;
    const mat = new StandardMaterial(`${ZONE_PREFIX}${zone.id}_mat`, scene);
    mat.diffuseColor = new Color3(...zone.color);
    mat.emissiveColor = new Color3(...zone.color).scale(0.35);
    mat.alpha = 0.35;
    mat.specularColor = Color3.Black();
    floor.material = mat;
    createLabel(
      scene,
      `zone_${zone.id}`,
      zone.title,
      zone.labelPosition,
      zone.labelRotationY,
      { height: 0.24, accent: zone.color },
    );
  }
  for (const p of LAB_LAYOUT) {
    const text = ITEM_LABELS[p.id];
    const zone = zoneOf(p.id);
    if (!text || !zone) continue;
    const [x, y, z] = p.position;
    const lift = y > 0.5 ? 0.32 : 0.75;
    const toward =
      zone.labelRotationY === 0
        ? ([0, 0, -0.12] as const)
        : zone.labelRotationY > 0
          ? ([-0.12, 0, 0] as const)
          : zone.labelRotationY < -1
            ? ([0.12, 0, 0] as const)
            : ([0, 0, 0.12] as const);
    createLabel(
      scene,
      p.id,
      text,
      [x + toward[0], y + lift, z + toward[2]],
      zone.labelRotationY === Math.PI ? Math.PI : zone.labelRotationY,
      { accent: zone.color },
    );
  }
}

export function mountInfoPanel(scene: Scene, screenCenterY = 1.6): boolean {
  const anchor = scene.getTransformNodeByName(
    "place_info_panel",
  ) as TransformNode | null;
  if (!anchor) return false;
  for (const mesh of anchor.getChildMeshes()) {
    if (/foot|stand/i.test(mesh.name)) mesh.setEnabled(false);
  }
  anchor.computeWorldMatrix(true);
  const { min, max } = anchor.getHierarchyBoundingVectors(true, (m) =>
    m.isEnabled(),
  );
  if (!Number.isFinite(min.y) || max.y <= min.y) return false;
  anchor.position.y += screenCenterY - (min.y + max.y) / 2;
  anchor.position.z += ROOM.depth / 2 - 0.04 - max.z;
  anchor.computeWorldMatrix(true);
  return true;
}

export function createDropZones(scene: Scene): void {
  const ids = DROP_ZONES.map((z) => z.id);
  for (const mesh of [...scene.meshes]) {
    if (
      !mesh.name.startsWith(DROP_PREFIX) &&
      !mesh.name.startsWith(LABEL_PREFIX) &&
      ids.some((id) => mesh.name.includes(id))
    )
      mesh.dispose();
  }
  const fill = new StandardMaterial(`${DROP_PREFIX}fill_mat`, scene);
  fill.diffuseColor = new Color3(0.15, 0.85, 0.55);
  fill.emissiveColor = new Color3(0.05, 0.45, 0.28);
  fill.alpha = 0.45;
  fill.specularColor = Color3.Black();
  const edge = new StandardMaterial(`${DROP_PREFIX}edge_mat`, scene);
  edge.emissiveColor = new Color3(0.3, 1, 0.65);
  edge.disableLighting = true;
  for (const zone of DROP_ZONES) {
    const [cx, cy, cz] = zone.center;
    const w = zone.half[0] * 2;
    const d = zone.half[2] * 2;
    const pad = MeshBuilder.CreateBox(
      DROP_PREFIX + zone.id,
      { width: w, depth: d, height: 0.004 },
      scene,
    );
    pad.position.set(cx, cy + 0.003, cz);
    pad.material = fill;
    pad.isPickable = false;
    const t = 0.012;
    const edges: [number, number, number, number][] = [
      [0, -d / 2, w + t, t],
      [0, d / 2, w + t, t],
      [-w / 2, 0, t, d],
      [w / 2, 0, t, d],
    ];
    edges.forEach(([ox, oz, ew, ed], i) => {
      const bar = MeshBuilder.CreateBox(
        `${DROP_PREFIX}${zone.id}_edge${i}`,
        { width: ew, depth: ed, height: 0.008 },
        scene,
      );
      bar.position.set(cx + ox, cy + 0.005, cz + oz);
      bar.material = edge;
      bar.isPickable = false;
    });
    createLabel(
      scene,
      `${DROP_PREFIX}${zone.id}`,
      zone.label,
      [cx, cy + 0.18, cz - zone.half[2] - 0.02],
      0,
      { height: 0.08, accent: [0.3, 1, 0.65] },
    );
  }
}
