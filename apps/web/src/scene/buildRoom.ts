import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
} from "@babylonjs/core";
import { createBevelBox } from "./bevelBox";
import { createParquet } from "./parquet";
import { buildExterior } from "./exterior";
import { CONSOLE_HEIGHT, ROOM, TABLE_HEIGHT } from "./labLayout";
function mat(s: Scene, n: string, c: Color3, e = false) {
  const m = new StandardMaterial(n, s);
  m.diffuseColor = c;
  m.specularColor = new Color3(0.04, 0.04, 0.04);
  if (e) m.emissiveColor = c;
  return m;
}
function box(
  s: Scene,
  n: string,
  z: [number, number, number],
  p: [number, number, number],
  m: StandardMaterial,
  c = true,
) {
  const q = createBevelBox(n, { width: z[0], height: z[1], depth: z[2] }, s);
  q.position.set(...p);
  q.material = m;
  q.checkCollisions = c;
  return q;
}
function merge(n: string, p: Mesh[]) {
  const m = Mesh.MergeMeshes(p, true, true);
  if (!m) throw Error(n);
  m.name = n;
  m.checkCollisions = true;
  return m;
}
function table(
  s: Scene,
  n: string,
  x: number,
  z: number,
  w: StandardMaterial,
  l: StandardMaterial,
) {
  return merge(n, [
    box(s, n + "_top", [1.8, 0.06, 0.8], [x, TABLE_HEIGHT - 0.03, z], w),
    ...[-1, 1].flatMap((a) =>
      [-1, 1].map((b) =>
        box(
          s,
          n + "_leg",
          [0.06, TABLE_HEIGHT - 0.06, 0.06],
          [x + a * 0.84, (TABLE_HEIGHT - 0.06) / 2, z + b * 0.34],
          l,
        ),
      ),
    ),
  ]);
}
function stool(
  s: Scene,
  n: string,
  x: number,
  z: number,
  w: StandardMaterial,
  l: StandardMaterial,
) {
  return merge(n, [
    box(s, n + "_seat", [0.42, 0.06, 0.42], [x, 0.57, z], w),
    ...[-1, 1].flatMap((a) =>
      [-1, 1].map((b) =>
        box(
          s,
          n + "_leg",
          [0.035, 0.55, 0.035],
          [x + a * 0.16, 0.275, z + b * 0.16],
          l,
        ),
      ),
    ),
  ]);
}
export function buildRoom(scene: Scene): Mesh[] {
  const { width: W, depth: D, height: H } = ROOM;
  const wall = mat(scene, "M_Wall", new Color3(0.72, 0.74, 0.67)),
    ceil = mat(scene, "M_Ceiling", new Color3(0.82, 0.81, 0.72)),
    oak = mat(scene, "M_Worktop", new Color3(0.42, 0.24, 0.1)),
    metal = mat(scene, "M_Metal", new Color3(0.25, 0.3, 0.27)),
    ivory = mat(scene, "M_Ivory", new Color3(0.68, 0.67, 0.54)),
    dark = mat(scene, "M_Dark", new Color3(0.08, 0.1, 0.09)),
    glass = mat(scene, "M_Glass", new Color3(0.35, 0.55, 0.54)),
    lamp = mat(scene, "M_Lamp", new Color3(1, 0.88, 0.61), true),
    green = mat(scene, "M_Screen", new Color3(0.08, 0.65, 0.25), true),
    white = mat(scene, "M_White", new Color3(0.92, 0.89, 0.76)),
    red = mat(scene, "M_Red", new Color3(0.65, 0.08, 0.05)),
    black = mat(scene, "M_Black", new Color3(0.03, 0.03, 0.025));
  glass.alpha = 0.12;
  const out: Mesh[] = [];
  const add = (...m: Mesh[]) => out.push(...m);
  const floorBase = MeshBuilder.CreateGround(
    "floor_base",
    { width: W, height: D },
    scene,
  );
  floorBase.material = mat(scene, "M_ParquetGap", new Color3(0.14, 0.08, 0.04));
  floorBase.checkCollisions = true;
  floorBase.position.y = -0.021;
  add(floorBase, createParquet("floor", scene, { width: W, depth: D }));
  add(
    box(scene, "ceiling", [W, 0.1, D], [0, H + 0.05, 0], ceil, false),
    box(scene, "wall_north", [W, H, 0.1], [0, H / 2, D / 2 + 0.05], wall),
    box(scene, "wall_south", [W, H, 0.1], [0, H / 2, -D / 2 - 0.05], wall),
    box(scene, "wall_west", [0.1, H, D], [-W / 2 - 0.05, H / 2, 0], wall),
    // east wall split around window
    box(scene, "wall_east_a", [0.1, H, 2.2], [W / 2 + 0.05, H / 2, -2.9], wall),
    box(scene, "wall_east_b", [0.1, H, 2.2], [W / 2 + 0.05, H / 2, 2.9], wall),
    box(
      scene,
      "wall_east_low",
      [0.1, 0.85, 3.6],
      [W / 2 + 0.05, 0.425, 0],
      wall,
    ),
    box(
      scene,
      "wall_east_high",
      [0.1, 0.65, 3.6],
      [W / 2 + 0.05, 2.675, 0],
      wall,
    ),
  );
  // window, grey courtyard and nine-storey block seen outside
  add(
    box(
      scene,
      "window_glass",
      [0.025, 1.5, 3.55],
      [4.99, 1.6, 0],
      glass,
      false,
    ),
    box(
      scene,
      "window_frame_v",
      [0.08, 1.55, 0.07],
      [4.96, 1.6, 0],
      dark,
      false,
    ),
    box(
      scene,
      "window_frame_h",
      [0.08, 0.07, 3.6],
      [4.96, 1.6, 0],
      dark,
      false,
    ),
  );
  add(
    box(scene, "door", [1, 2.1, 0.06], [-3.5, 1.05, -3.97], oak),
    table(scene, "table_a", -2, 1, oak, metal),
    table(scene, "table_b", 3.15, 1, oak, metal),
    stool(scene, "stool_a", -2, 0.25, oak, metal),
    stool(scene, "stool_b", 2, 0.25, oak, metal),
  );
  // reagent cabinet + bottles
  add(
    merge("reagent_cabinet", [
      box(scene, "cab_back", [2, 2.35, 0.04], [-3.7, 1.175, 3.91], metal),
      box(scene, "cab_side", [0.04, 2.35, 0.45], [-4.68, 1.175, 3.705], metal),
      box(scene, "cab_side", [0.04, 2.35, 0.45], [-2.72, 1.175, 3.705], metal),
      box(scene, "cab_bottom", [2, 0.3, 0.45], [-3.7, 0.15, 3.705], metal),
      box(scene, "cab_top", [2, 0.04, 0.45], [-3.7, 2.33, 3.705], metal),
      box(scene, "cab_shelf", [1.92, 0.03, 0.42], [-3.7, 0.95, 3.71], ivory),
      box(scene, "cab_shelf", [1.92, 0.03, 0.42], [-3.7, 1.6, 3.71], ivory),
    ]),
    box(
      scene,
      "reagent_glass",
      [1.9, 1.95, 0.02],
      [-3.7, 1.3, 3.47],
      glass,
      false,
    ),
  );
  for (let i = 0; i < 10; i++)
    add(
      box(
        scene,
        "reagent_bottle",
        [0.12, 0.25, 0.12],
        [
          -4.35 + (i % 5) * 0.32,
          [0.425, 1.09, 1.74][i % 3 === 2 ? 2 : Math.floor(i / 5)],
          3.72,
        ],
        i % 3 === 0 ? red : i % 3 === 1 ? green : ivory,
        false,
      ),
    );
  // chalkboard, clock
  add(
    box(scene, "chalkboard", [2.5, 1, 0.05], [-0.6, 2.05, 3.92], dark, false),
    box(
      scene,
      "chalk_formula",
      [1.7, 0.025, 0.035],
      [-0.6, 2.08, 3.88],
      white,
      false,
    ),
  );
  const clock = MeshBuilder.CreateCylinder(
    "wall_clock",
    { diameter: 0.5, height: 0.06, tessellation: 12 },
    scene,
  );
  clock.rotation.x = Math.PI / 2;
  clock.position.set(1.15, 2.45, 3.9);
  clock.material = white;
  add(clock);
  // fume cupboard & sink under window
  add(
    box(scene, "fume_cupboard", [1.5, 2.4, 0.75], [3.95, 1.2, 3.45], metal),
    box(
      scene,
      "fume_glass",
      [1.25, 0.9, 0.03],
      [3.95, 1.55, 3.05],
      glass,
      false,
    ),
    box(scene, "fume_duct", [0.45, 0.6, 0.45], [3.95, 2.7, 3.55], ivory),
    box(scene, "sink_unit", [1.3, 0.9, 0.65], [4.35, 0.45, 2.1], ivory),
    box(scene, "sink_basin", [0.8, 0.05, 0.45], [4.35, 0.93, 2.1], dark, false),
  );
  // electronics rack, oscilloscope, knobs/indicators
  add(
    box(scene, "instrument_rack", [0.7, 1.8, 1.4], [4.6, 0.9, -3.1], metal),
    box(scene, "oscilloscope", [0.55, 0.5, 0.8], [4.6, 2.05, -3.1], ivory),
    box(
      scene,
      "scope_screen",
      [0.02, 0.25, 0.4],
      [4.315, 2.08, -3.1],
      green,
      false,
    ),
  );
  for (let i = 0; i < 8; i++)
    add(
      box(
        scene,
        "rack_indicator",
        [0.018, 0.11, 0.11],
        [4.24, 0.35 + (i % 4) * 0.36, -3.55 + Math.floor(i / 4) * 0.65],
        i % 2 ? white : green,
        false,
      ),
    );
  add(
    box(
      scene,
      "control_console",
      [0.6, CONSOLE_HEIGHT, 1.2],
      [4.65, CONSOLE_HEIGHT / 2, 1],
      metal,
    ),
  );
  // lab assistant desk, phone, lamp, papers, chair
  add(
    table(scene, "assistant_desk", 0.5, -2.6, oak, metal),
    stool(scene, "assistant_chair", 0.5, -3.35, oak, metal),
    box(
      scene,
      "rotary_phone",
      [0.38, 0.2, 0.3],
      [0.05, 1.0, -2.55],
      black,
      false,
    ),
    box(
      scene,
      "lab_journal",
      [0.45, 0.035, 0.3],
      [0.68, 0.9175, -2.6],
      white,
      false,
    ),
    box(
      scene,
      "desk_lamp_base",
      [0.25, 0.08, 0.25],
      [1.05, 0.94, -2.5],
      metal,
      false,
    ),
    box(
      scene,
      "desk_lamp_arm",
      [0.05, 0.55, 0.05],
      [1.05, 1.255, -2.5],
      metal,
      false,
    ),
    box(
      scene,
      "desk_lamp_shade",
      [0.35, 0.2, 0.35],
      [1.05, 1.63, -2.5],
      green,
      false,
    ),
  );
  // safe, fire board, radiator, pipes (coat rack removed: the parcel stands there)
  add(
    box(scene, "safe", [0.8, 1, 0.65], [-4.5, 0.5, -2.65], metal),
    box(scene, "fire_board", [0.05, 1.1, 1], [-4.92, 1.45, -3.25], red, false),
    box(scene, "radiator", [0.18, 0.65, 1.3], [4.85, 0.345, -0.65], white),
    box(scene, "ceiling_pipe", [0.12, 0.12, 8], [-4.55, 2.75, 0], ivory, false),
  );
  // Polish signs
  add(
    box(scene, "sign_bhp", [1.5, 0.65, 0.04], [2.35, 2.05, 3.92], ivory, false),
    box(
      scene,
      "sign_text_bhp",
      [1.05, 0.05, 0.025],
      [2.35, 2.12, 3.88],
      red,
      false,
    ),
    box(
      scene,
      "sign_light",
      [1.2, 0.35, 0.04],
      [-1.9, 2.55, -3.92],
      ivory,
      false,
    ),
  );
  for (const [i, x] of [-2.5, 2.5].entries())
    for (const z of [-2, 2])
      add(
        box(
          scene,
          `ceiling_lamp_${i}_${z}`,
          [1.2, 0.04, 0.3],
          [x, H - 0.02, z],
          lamp,
          false,
        ),
      );
  const shelfX = -W / 2 + 0.25;
  add(
    merge("shelf", [
      box(scene, "shelf_side", [0.4, 2.2, 0.04], [shelfX, 1.1, -1.8], metal),
      box(scene, "shelf_side", [0.4, 2.2, 0.04], [shelfX, 1.1, 0.2], metal),
      ...[0.5, 1.1, 1.7, 2.2].map((y) =>
        box(scene, "shelf_board", [0.4, 0.04, 2.0], [shelfX, y, -0.8], oak),
      ),
    ]),
  );
  buildExterior(scene);
  for (const m of out) {
    m.isPickable = m.name !== "ceiling";
    m.receiveShadows = true;
    m.freezeWorldMatrix();
  }
  return out;
}
