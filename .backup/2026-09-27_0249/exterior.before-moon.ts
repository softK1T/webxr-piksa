import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
} from "@babylonjs/core";

/** View from a 4th-floor lab window: a real Polish/Soviet nine-storey panel
 * block (wielka płyta) across a street with trees. Low-poly, flat shaded,
 * merged per material (~15 draw calls). Room floor is at y=0, so the street
 * level is 4 storeys (~12 m) below. */
export const STREET_Y = -12.4;
const FLOOR_H = 2.8;

type Part = Mesh;

export function buildExterior(scene: Scene): Mesh[] {
  const buckets = new Map<string, { m: StandardMaterial; parts: Part[] }>();
  const mat = (name: string, c: Color3, glow = 0.2) => {
    let b = buckets.get(name);
    if (!b) {
      const m = new StandardMaterial(`MX_${name}`, scene);
      // evening: dim albedo keeps low-poly facets but kills daylight look
      m.diffuseColor = glow >= 1 ? Color3.Black() : c.scale(0.45);
      m.emissiveColor = c.scale(glow);
      m.specularColor = Color3.Black();
      b = { m, parts: [] };
      buckets.set(name, b);
    }
    return b;
  };
  const C = (r: number, g: number, b: number) => new Color3(r, g, b);
  const P = {
    panel: mat("panel", C(0.74, 0.72, 0.66)),
    panel2: mat("panel2", C(0.64, 0.66, 0.63)),
    seam: mat("seam", C(0.42, 0.41, 0.38)),
    glass: mat("glass", C(0.12, 0.15, 0.2), 0.15),
    lit: mat("lit", C(1, 0.7, 0.36), 1),
    frame: mat("frame", C(0.86, 0.84, 0.78)),
    balcony: mat("balcony", C(0.58, 0.56, 0.52)),
    rail: mat("rail", C(0.35, 0.42, 0.4)),
    roof: mat("roof", C(0.3, 0.3, 0.3)),
    asphalt: mat("asphalt", C(0.16, 0.16, 0.18), 0.12),
    marking: mat("marking", C(0.85, 0.85, 0.8)),
    curb: mat("curb", C(0.6, 0.6, 0.58)),
    walk: mat("walk", C(0.5, 0.49, 0.47)),
    grass: mat("grass", C(0.32, 0.3, 0.15), 0.12),
    leaf: mat("leaf", C(0.78, 0.4, 0.1), 0.3),
    leaf2: mat("leaf2", C(0.86, 0.66, 0.16), 0.3),
    leafRed: mat("leafRed", C(0.62, 0.16, 0.08), 0.3),
    horizon: mat("horizon", C(0.62, 0.36, 0.28), 1),
    trunk: mat("trunk", C(0.3, 0.22, 0.15)),
    birch: mat("birch", C(0.85, 0.84, 0.8)),
    sky: mat("sky", C(0.16, 0.18, 0.3), 1),
    garage: mat("garage", C(0.45, 0.47, 0.44)),
  };
  const box = (
    b: { parts: Part[] },
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const m = MeshBuilder.CreateBox(
      "x",
      { width: w, height: h, depth: d },
      scene,
    );
    m.position.set(x, y, z);
    b.parts.push(m);
    return m;
  };
  const Y = STREET_Y;

  // ground: lawn, sidewalks, street with markings and curbs
  box(P.grass, 400, 0.1, 400, 0, Y - 0.05, 0);
  box(P.walk, 3, 0.14, 300, 11.5, Y + 0.07, 0);
  box(P.curb, 0.25, 0.2, 300, 13.1, Y + 0.1, 0);
  box(P.asphalt, 8, 0.1, 300, 17.3, Y + 0.05, 0);
  box(P.curb, 0.25, 0.2, 300, 21.5, Y + 0.1, 0);
  box(P.walk, 3, 0.14, 300, 23.1, Y + 0.07, 0);
  for (let z = -140; z < 140; z += 6)
    box(P.marking, 0.15, 0.02, 3, 17.3, Y + 0.11, z);
  // driveway to the block
  box(P.asphalt, 5, 0.1, 80, 30, Y + 0.05, 0);

  // nine-storey panel block, facade facing the lab (west)
  const bx = 38; // facade plane x
  const len = 72;
  const depth = 12;
  const H = 9 * FLOOR_H + 0.6;
  box(P.panel, depth, H, len, bx + depth / 2, Y + H / 2, 0);
  box(P.seam, depth + 0.1, 0.8, len + 0.1, bx + depth / 2, Y + 0.4, 0); // plinth
  const col = 3.0;
  const cols = Math.floor(len / col);
  const z0 = -len / 2 + col / 2;
  let n = 7;
  const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647;
  for (let f = 0; f < 9; f++) {
    const fy = Y + 0.6 + f * FLOOR_H;
    box(P.seam, 0.06, 0.05, len, bx - 0.02, fy, 0); // horizontal panel seam
    for (let c = 0; c < cols; c++) {
      const z = z0 + c * col;
      if (f === 0)
        box(P.seam, 0.06, H, 0.05, bx - 0.02, Y + H / 2, z - col / 2);
      // alternate panel tint like real prefab blocks
      if ((c + f) % 5 === 0)
        box(
          P.panel2,
          0.04,
          FLOOR_H - 0.06,
          col - 0.06,
          bx - 0.03,
          fy + FLOOR_H / 2,
          z,
        );
      const stair = c % 6 === 3; // stairwell column: narrow window, entrance below
      const ww = stair ? 0.8 : 1.5;
      const wh = stair ? 1.0 : 1.45;
      const wy = fy + (stair ? 1.7 : 1.45);
      box(P.frame, 0.08, wh + 0.12, ww + 0.12, bx - 0.05, wy, z);
      box(rnd() < 0.5 ? P.lit : P.glass, 0.1, wh, ww, bx - 0.06, wy, z);
      box(P.frame, 0.1, wh, 0.06, bx - 0.1, wy, z); // mullion
      if (!stair && c % 2 === 0 && f > 0) {
        // loggia balcony slab + parapet panel
        box(P.balcony, 1.2, 0.15, col - 0.3, bx - 0.6, fy + 0.08, z + 0.1);
        const glazed = rnd() < 0.3;
        box(
          glazed ? P.glass : P.balcony,
          0.1,
          1.0,
          col - 0.3,
          bx - 1.15,
          fy + 0.6,
          z + 0.1,
        );
        box(P.rail, 0.14, 0.06, col - 0.3, bx - 1.17, fy + 1.12, z + 0.1);
        if (glazed)
          box(P.frame, 0.12, 1.25, 0.06, bx - 1.15, fy + 1.75, z + 0.1);
      }
      if (stair && f === 0) {
        box(P.roof, 0.1, 2.1, 1.4, bx - 0.06, Y + 1.05, z); // door
        box(P.balcony, 1.8, 0.15, 2.4, bx - 0.9, Y + 2.55, z); // canopy
        box(P.curb, 1.8, 0.3, 2.2, bx - 0.9, Y + 0.15, z); // steps
      }
    }
  }
  // roof: parapet, lift machine rooms, antennas
  box(P.roof, depth + 0.3, 0.5, len + 0.3, bx + depth / 2, Y + H + 0.25, 0);
  for (const z of [-24, 0, 24]) {
    box(P.panel2, 4, 2.4, 5, bx + depth / 2, Y + H + 1.2, z);
    box(P.rail, 0.08, 3, 0.08, bx + depth / 2 - 1, Y + H + 3.5, z + 1.5);
    box(P.rail, 1.6, 0.06, 0.06, bx + depth / 2 - 1, Y + H + 4.6, z + 1.5);
  }
  // second block far away for depth
  box(P.panel2, 12, 28, 60, 75, Y + 14, -55);
  for (let f = 0; f < 10; f++)
    for (let c = 0; c < 18; c++)
      box(
        rnd() < 0.45 ? P.lit : P.glass,
        0.1,
        1.2,
        1.4,
        68.9,
        Y + 1.6 + f * 2.8,
        -80 + c * 3,
      );
  // row of garages
  for (let i = 0; i < 8; i++) {
    box(P.garage, 6, 2.4, 3.2, 3, Y + 1.2, -40 + i * 3.3);
    box(P.rail, 0.06, 2, 2.6, -0.03, Y + 1.0, -40 + i * 3.3);
  }

  // trees: poplars, birches and broad lindens, low-poly crowns
  const crown = (
    b: { parts: Part[] },
    x: number,
    y: number,
    z: number,
    r: number,
    sy: number,
  ) => {
    const s = MeshBuilder.CreateIcoSphere(
      "x",
      { radius: r, subdivisions: 1, flat: true },
      scene,
    );
    s.scaling.y = sy;
    s.rotation.y = x * 0.37 + z;
    s.position.set(x, y, z);
    b.parts.push(s);
  };
  const trunk = (
    b: { parts: Part[] },
    x: number,
    z: number,
    h: number,
    r: number,
  ) => {
    const t = MeshBuilder.CreateCylinder(
      "x",
      { height: h, diameterTop: r * 0.6, diameterBottom: r, tessellation: 6 },
      scene,
    );
    t.position.set(x, Y + h / 2, z);
    b.parts.push(t);
  };
  const tree = (x: number, z: number, kind: number) => {
    const s = 0.8 + rnd() * 0.5;
    if (kind === 0) {
      trunk(P.trunk, x, z, 10 * s, 0.45);
      crown(P.leaf, x, Y + 11 * s, z, 2.2 * s, 2.6);
    } else if (kind === 1) {
      trunk(P.birch, x, z, 8 * s, 0.3);
      crown(P.leaf2, x, Y + 8 * s, z, 2.4 * s, 1.4);
      crown(P.leaf2, x + 0.8, Y + 9.5 * s, z - 0.5, 1.6 * s, 1.3);
    } else {
      trunk(P.trunk, x, z, 5 * s, 0.6);
      crown(P.leaf, x, Y + 7 * s, z, 3.4 * s, 1.0);
      crown(P.leafRed, x + 1.5, Y + 8 * s, z + 1, 2.4 * s, 1.0);
    }
  };
  for (let z = -120; z <= 120; z += 9) {
    tree(9.5 + rnd(), z + rnd() * 3, 0); // poplars along our sidewalk
    tree(25 + rnd(), z + 4 + rnd() * 3, z % 2 ? 2 : 1); // across the street
  }
  for (let i = 0; i < 18; i++) tree(28 + rnd() * 8, -60 + rnd() * 120, i % 3);
  // street lamps
  for (let z = -100; z <= 100; z += 25) {
    box(P.rail, 0.15, 7, 0.15, 13.4, Y + 3.5, z);
    box(P.rail, 1.4, 0.12, 0.2, 14.0, Y + 7, z);
    box(P.lit, 0.5, 0.15, 0.3, 14.6, Y + 6.9, z);
  }
  // fallen leaves on lawns and sidewalks
  for (let i = 0; i < 260; i++) {
    const lx = 8 + rnd() * 26;
    if (lx > 13 && lx < 21.5) continue; // keep the road clean
    const leaf = box(
      [P.leaf, P.leaf2, P.leafRed][i % 3],
      0.35 + rnd() * 0.5,
      0.02,
      0.3 + rnd() * 0.4,
      lx,
      Y + 0.12,
      -110 + rnd() * 220,
    );
    leaf.rotation.y = rnd() * Math.PI;
  }
  // low warm afterglow along the horizon, dusk sky above
  box(P.horizon, 1, 14, 500, 158, Y + 7, 0);
  // evening sky shell
  box(P.sky, 1, 200, 500, 160, 40, 0);
  box(P.sky, 500, 200, 1, 0, 40, 200);
  box(P.sky, 500, 200, 1, 0, 40, -200);
  box(P.sky, 500, 1, 500, 0, 110, 0);

  const out: Mesh[] = [];
  for (const [name, b] of buckets) {
    if (!b.parts.length) continue;
    const m = Mesh.MergeMeshes(b.parts, true, true);
    if (!m) continue;
    m.name = `exterior_${name}`;
    m.material = b.m;
    m.isPickable = false;
    m.checkCollisions = false;
    m.freezeWorldMatrix();
    m.doNotSyncBoundingInfo = true;
    out.push(m);
  }
  return out;
}
