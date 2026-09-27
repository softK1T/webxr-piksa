import {
  Color3,
  Mesh,
  Scene,
  StandardMaterial,
  VertexData,
} from "@babylonjs/core";

/** Classic Polish/Soviet herringbone ("jodełka") parquet, low-poly:
 * every plank is its own chamfered block with its own oak tone,
 * all merged into ONE mesh / ONE draw call. */
export interface ParquetOptions {
  width: number;
  depth: number;
  plankW?: number;
  ratio?: number; // plank length = plankW * ratio
  height?: number;
  bevel?: number;
  seed?: number;
}

const OAK: [number, number, number][] = [
  [0.47, 0.3, 0.16],
  [0.42, 0.26, 0.13],
  [0.52, 0.34, 0.19],
  [0.38, 0.23, 0.11],
  [0.45, 0.29, 0.17],
  [0.35, 0.21, 0.1],
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type Rect = [number, number, number, number]; // x0, z0, x1, z1

/** Herringbone layout in axis-aligned form, clipped to the room. */
export function herringboneRects(
  width: number,
  depth: number,
  w: number,
  ratio: number,
): Rect[] {
  const L = w * ratio;
  const hx = width / 2;
  const hz = depth / 2;
  const out: Rect[] = [];
  const span = Math.ceil((width + depth) / w) + ratio * 2;
  const strips = Math.ceil((width + depth) / (2 * L)) + 2;
  for (let s = -strips; s <= strips; s++) {
    const ox = s * L;
    const oz = -s * L;
    for (let k = -span; k <= span; k++) {
      const bx = ox + k * w - hx;
      const bz = oz + k * w - hz;
      const cand: Rect[] = [
        [bx, bz, bx + L, bz + w],
        [bx, bz + w, bx + w, bz + w + L],
      ];
      for (const [x0, z0, x1, z1] of cand) {
        const cx0 = Math.max(x0, -hx);
        const cz0 = Math.max(z0, -hz);
        const cx1 = Math.min(x1, hx);
        const cz1 = Math.min(z1, hz);
        if (cx1 - cx0 > 0.012 && cz1 - cz0 > 0.012)
          out.push([cx0, cz0, cx1, cz1]);
      }
    }
  }
  return out;
}

export function createParquet(
  name: string,
  scene: Scene,
  o: ParquetOptions,
): Mesh {
  const w = o.plankW ?? 0.09;
  const ratio = o.ratio ?? 6;
  const h = o.height ?? 0.018;
  const b = o.bevel ?? 0.007;
  const rand = rng(o.seed ?? 1987);
  const pos: number[] = [];
  const col: number[] = [];
  const quad = (q: number[][], c: [number, number, number]) => {
    for (const i of [0, 2, 1, 0, 3, 2]) {
      pos.push(...q[i]);
      col.push(c[0], c[1], c[2], 1);
    }
  };
  for (const [x0, z0, x1, z1] of herringboneRects(o.width, o.depth, w, ratio)) {
    const base = OAK[Math.floor(rand() * OAK.length)];
    const j = 0.92 + rand() * 0.16;
    const top: [number, number, number] = [
      base[0] * j,
      base[1] * j,
      base[2] * j,
    ];
    const edge: [number, number, number] = [
      top[0] * 0.62,
      top[1] * 0.6,
      top[2] * 0.58,
    ];
    const hh = h - rand() * 0.0015; // tiny unevenness of old floor
    const lo = h - b * 0.8;
    const g = 0.0012; // hairline gap between planks
    const X0 = x0 + g,
      Z0 = z0 + g,
      X1 = x1 - g,
      Z1 = z1 - g;
    const bb = Math.min(b, (X1 - X0) / 3, (Z1 - Z0) / 3);
    const a = [X0 + bb, hh, Z0 + bb],
      c = [X1 - bb, hh, Z0 + bb];
    const d = [X1 - bb, hh, Z1 - bb],
      e = [X0 + bb, hh, Z1 - bb];
    const A = [X0, lo, Z0],
      C = [X1, lo, Z0],
      Dd = [X1, lo, Z1],
      E = [X0, lo, Z1];
    quad([a, e, d, c], top);
    quad([A, a, c, C], edge);
    quad([C, c, d, Dd], edge);
    quad([Dd, d, e, E], edge);
    quad([E, e, a, A], edge);
  }
  const vd = new VertexData();
  vd.positions = pos;
  vd.colors = col;
  vd.indices = pos.map((_, i) => i).slice(0, pos.length / 3);
  const normals: number[] = [];
  VertexData.ComputeNormals(pos, vd.indices, normals);
  vd.normals = normals;
  const mesh = new Mesh(name, scene);
  vd.applyToMesh(mesh);
  const m = new StandardMaterial(`M_${name}`, scene);
  m.diffuseColor = Color3.White();
  m.specularColor = new Color3(0.09, 0.07, 0.05);
  m.specularPower = 24;
  mesh.material = m;
  mesh.hasVertexAlpha = false;
  mesh.isPickable = true;
  mesh.receiveShadows = true;
  mesh.checkCollisions = true;
  mesh.position.y = -h; // plank tops flush with y=0, furniture stands on them
  mesh.freezeWorldMatrix();
  return mesh;
}
