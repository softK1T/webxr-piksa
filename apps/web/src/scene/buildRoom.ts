import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
} from "@babylonjs/core";
import { CONSOLE_HEIGHT, ROOM, TABLE_HEIGHT } from "./labLayout";

function mat(scene: Scene, name: string, color: Color3, emissive = false) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = color;
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  if (emissive) m.emissiveColor = color;
  return m;
}

function box(
  scene: Scene,
  name: string,
  size: [number, number, number],
  pos: [number, number, number],
  material: StandardMaterial,
  collide = true,
): Mesh {
  const [width, height, depth] = size;
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(...pos);
  mesh.material = material;
  mesh.checkCollisions = collide;
  return mesh;
}

function merge(name: string, parts: Mesh[]): Mesh {
  const merged = Mesh.MergeMeshes(parts, true, true);
  if (!merged) throw new Error(`Cannot merge ${name}`);
  merged.name = name;
  merged.checkCollisions = true;
  return merged;
}

function table(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  m: StandardMaterial,
  legM: StandardMaterial,
) {
  const w = 1.8;
  const d = 0.8;
  const top = box(
    scene,
    `${name}_top`,
    [w, 0.06, d],
    [x, TABLE_HEIGHT - 0.03, z],
    m,
  );
  const legs = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) =>
      box(
        scene,
        `${name}_leg`,
        [0.06, TABLE_HEIGHT - 0.06, 0.06],
        [
          x + sx * (w / 2 - 0.06),
          (TABLE_HEIGHT - 0.06) / 2,
          z + sz * (d / 2 - 0.06),
        ],
        legM,
      ),
    ),
  );
  return merge(name, [top, ...legs]);
}

export function buildRoom(scene: Scene): Mesh[] {
  const { width: W, depth: D, height: H } = ROOM;
  const floorM = mat(scene, "M_Floor", new Color3(0.36, 0.4, 0.44));
  const wallM = mat(scene, "M_Wall", new Color3(0.82, 0.85, 0.83));
  const ceilM = mat(scene, "M_Ceiling", new Color3(0.9, 0.9, 0.9));
  const woodM = mat(scene, "M_Worktop", new Color3(0.86, 0.88, 0.9));
  const metalM = mat(scene, "M_Metal", new Color3(0.25, 0.28, 0.32));
  const doorM = mat(scene, "M_Door", new Color3(0.42, 0.3, 0.2));
  const lampM = mat(scene, "M_Lamp", new Color3(1, 0.97, 0.9), true);
  const benchM = mat(scene, "M_BenchZone", new Color3(0.3, 0.75, 0.95));
  const zoneM = mat(scene, "M_PrepZone", new Color3(0.95, 0.75, 0.15));

  const floor = MeshBuilder.CreateGround(
    "floor",
    { width: W, height: D },
    scene,
  );
  floor.material = floorM;
  floor.checkCollisions = true;
  const t = 0.1;
  const meshes: Mesh[] = [
    floor,
    box(scene, "ceiling", [W, t, D], [0, H + t / 2, 0], ceilM, false),
    box(scene, "wall_north", [W, H, t], [0, H / 2, D / 2 + t / 2], wallM),
    box(scene, "wall_south", [W, H, t], [0, H / 2, -D / 2 - t / 2], wallM),
    box(scene, "wall_east", [t, H, D], [W / 2 + t / 2, H / 2, 0], wallM),
    box(scene, "wall_west", [t, H, D], [-W / 2 - t / 2, H / 2, 0], wallM),
    box(scene, "door", [1.0, 2.1, 0.06], [-3.5, 1.05, -D / 2 + 0.03], doorM),
    table(scene, "table_a", -2, 1, woodM, metalM),
    table(scene, "table_b", 2, 1, woodM, metalM),
    box(
      scene,
      "workbench_zone",
      [0.5, 0.005, 0.4],
      [-2.5, TABLE_HEIGHT + 0.003, 1.1],
      benchM,
      false,
    ),
    box(
      scene,
      "prep_zone",
      [0.5, 0.005, 0.4],
      [-1.9, TABLE_HEIGHT + 0.003, 0.6],
      zoneM,
      false,
    ),
  ];

  const sx = -W / 2 + 0.25;
  const shelfParts = [
    box(scene, "shelf_side", [0.4, 2.2, 0.04], [sx, 1.1, -1.8], metalM),
    box(scene, "shelf_side", [0.4, 2.2, 0.04], [sx, 1.1, 0.2], metalM),
    ...[0.5, 1.1, 1.7, 2.2].map((y) =>
      box(scene, "shelf_board", [0.4, 0.04, 2.0], [sx, y, -0.8], woodM),
    ),
  ];
  meshes.push(merge("shelf", shelfParts));
  meshes.push(
    box(
      scene,
      "control_console",
      [0.6, CONSOLE_HEIGHT, 1.2],
      [W / 2 - 0.35, CONSOLE_HEIGHT / 2, 1],
      metalM,
    ),
  );

  for (const [i, x] of [-2.5, 2.5].entries()) {
    for (const z of [-2, 2]) {
      meshes.push(
        box(
          scene,
          `ceiling_lamp_${i}_${z}`,
          [1.2, 0.04, 0.3],
          [x, H - 0.02, z],
          lampM,
          false,
        ),
      );
    }
  }
  for (const m of meshes) {
    m.isPickable = m.name !== "ceiling";
    m.receiveShadows = true;
    m.freezeWorldMatrix();
  }
  return meshes;
}
