import {
  Color3,
  StandardMaterial,
  Texture,
  type AbstractMesh,
  type Scene,
} from "@babylonjs/core";

export type TextureSet =
  | "tiles"
  | "plaster"
  | "ceiling"
  | "wood"
  | "oak"
  | "metal_door"
  | "concrete"
  | "blocks"
  | "rubber"
  | "steel";

/** Metres covered by one texture repeat. */
export const TILE_SIZE: Record<TextureSet, number> = {
  tiles: 1.2,
  plaster: 2,
  ceiling: 1.2,
  wood: 1,
  oak: 1.2,
  metal_door: 0,
  concrete: 2,
  blocks: 2,
  rubber: 1,
  steel: 1,
};

const RULES: [RegExp, TextureSet][] = [
  [/^range_door$|^door$/, "metal_door"],
  [/^ceiling$/, "ceiling"],
  [/^range_ceiling$/, "concrete"],
  [/^wall_|^range_wall_(s|n|lintel)$/, "plaster"],
  [/^range_wall_(north|south)$/, "blocks"],
  [/^range_floor$/, "concrete"],
  [/^range_backstop$|^range_baffle$/, "rubber"],
  [/^table_|^range_counter|^range_bench/, "oak"],
  [
    /^shelf|^control_console$|^range_divider$|^range_stand$|^range_button_plate$/,
    "steel",
  ],
];

export function textureSetFor(name: string): TextureSet | null {
  for (const [re, set] of RULES) if (re.test(name)) return set;
  return null;
}

export function applyRoomTextures(scene: Scene, base = "/textures") {
  const cache = new Map<string, Texture>();
  const tex = (file: string) => {
    let t = cache.get(file);
    if (!t) {
      t = new Texture(`${base}/${file}.png`, scene);
      t.wrapU = t.wrapV = Texture.WRAP_ADDRESSMODE;
      cache.set(file, t);
    }
    return t;
  };
  let count = 0;
  const apply = (mesh: AbstractMesh) => {
    const set = textureSetFor(mesh.name);
    if (!set) return;
    mesh.computeWorldMatrix(true);
    const ext = mesh.getBoundingInfo().boundingBox.extendSizeWorld.scale(2);
    const ground = mesh.getClassName() === "GroundMesh" || ext.y < 0.02;
    const tile = TILE_SIZE[set];
    const u = tile ? (ground ? ext.x : Math.max(ext.x, ext.z)) / tile : 1;
    const v = tile ? (ground ? ext.z : ext.y) / tile : 1;
    const m = new StandardMaterial(`MT_${set}_${mesh.name}`, scene);
    const alb = tex(`${set}_albedo`).clone();
    const nrm = tex(`${set}_normal`).clone();
    const spec = tex(`${set}_spec`).clone();
    for (const t of [alb, nrm, spec]) {
      t.uScale = Math.max(1, u);
      t.vScale = Math.max(1, v);
    }
    m.diffuseTexture = alb;
    m.bumpTexture = nrm;
    m.bumpTexture.level = 0.8;
    m.specularTexture = spec;
    m.specularColor = new Color3(0.6, 0.6, 0.6);
    m.specularPower =
      set === "steel" || set === "metal_door"
        ? 96
        : set === "wood" || set === "tiles"
          ? 48
          : 12;
    mesh.material = m;
    count += 1;
  };
  scene.meshes.forEach(apply);
  return count;
}
