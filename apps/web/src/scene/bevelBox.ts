import { Mesh, Vector3, VertexData, type Scene } from "@babylonjs/core";

export interface BevelBoxOptions {
  width: number;
  height: number;
  depth: number;
  /** Chamfer width in metres; clamped to 45% of the smallest side. */
  bevel?: number;
}

/** Default chamfer: ~2 cm on furniture, proportionally smaller on small parts. */
export function defaultBevel(w: number, h: number, d: number): number {
  return Math.min(0.02, Math.min(w, h, d) * 0.18);
}

/**
 * Box with 45-degree chamfered edges and corners (6 faces + 12 edge strips + 8 corner
 * triangles), every facet flat-shaded so the thin edges catch highlights.
 * Winding matches MeshBuilder.CreateBox.
 */
export function createBevelBox(
  name: string,
  opts: BevelBoxOptions,
  scene: Scene,
): Mesh {
  const a = opts.width / 2;
  const b = opts.height / 2;
  const c = opts.depth / 2;
  const e = Math.min(
    opts.bevel ?? defaultBevel(opts.width, opts.height, opts.depth),
    Math.min(a, b, c) * 0.9,
  );
  const P = (axis: 0 | 1 | 2, sx: number, sy: number, sz: number) =>
    new Vector3(
      sx * (axis === 0 ? a : a - e),
      sy * (axis === 1 ? b : b - e),
      sz * (axis === 2 ? c : c - e),
    );
  const polys: Vector3[][] = [];
  const S = [-1, 1];
  // main faces
  for (const s of S) {
    polys.push(S.flatMap((u) => S.map((v) => P(0, s, u, v))));
    polys.push(S.flatMap((u) => S.map((v) => P(1, u, s, v))));
    polys.push(S.flatMap((u) => S.map((v) => P(2, u, v, s))));
  }
  // edge strips
  for (const s1 of S)
    for (const s2 of S) {
      polys.push(S.flatMap((z) => [P(0, s1, s2, z), P(1, s1, s2, z)])); // X-Y edges
      polys.push(S.flatMap((y) => [P(0, s1, y, s2), P(2, s1, y, s2)])); // X-Z edges
      polys.push(S.flatMap((x) => [P(1, x, s1, s2), P(2, x, s1, s2)])); // Y-Z edges
    }
  // corners
  for (const sx of S)
    for (const sy of S)
      for (const sz of S)
        polys.push([P(0, sx, sy, sz), P(1, sx, sy, sz), P(2, sx, sy, sz)]);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const poly of polys) {
    const center = poly
      .reduce((acc, p) => acc.addInPlace(p), Vector3.Zero())
      .scaleInPlace(1 / poly.length);
    const n = center.clone();
    // outward normal of a chamfer facet = sign pattern of its centre on the bevelled axes
    const plane = VertexData_planeNormal(poly, center);
    n.copyFrom(plane);
    const up =
      Math.abs(n.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const u = Vector3.Cross(up, n).normalize();
    const v = Vector3.Cross(n, u).normalize();
    const sorted = poly
      .map((p) => ({
        p,
        ang: Math.atan2(
          Vector3.Dot(p.subtract(center), v),
          Vector3.Dot(p.subtract(center), u),
        ),
      }))
      .sort((x, y) => x.ang - y.ang)
      .map((x) => x.p);
    const base = positions.length / 3;
    const ax =
      Math.abs(n.x) >= Math.abs(n.y) && Math.abs(n.x) >= Math.abs(n.z)
        ? 0
        : Math.abs(n.y) >= Math.abs(n.z)
          ? 1
          : 2;
    for (const p of sorted) {
      positions.push(p.x, p.y, p.z);
      normals.push(n.x, n.y, n.z);
      const [pu, pv, su, sv] =
        ax === 0
          ? [p.z, p.y, c, b]
          : ax === 1
            ? [p.x, p.z, a, c]
            : [p.x, p.y, a, b];
      uvs.push(pu / (2 * su) + 0.5, pv / (2 * sv) + 0.5);
    }
    for (let i = 1; i < sorted.length - 1; i++)
      indices.push(base, base + i + 1, base + i);
  }
  const vd = new VertexData();
  vd.positions = positions;
  vd.normals = normals;
  vd.uvs = uvs;
  vd.indices = indices;
  const mesh = new Mesh(name, scene);
  vd.applyToMesh(mesh);
  return mesh;
}

function VertexData_planeNormal(poly: Vector3[], center: Vector3): Vector3 {
  const n = Vector3.Cross(poly[1].subtract(poly[0]), poly[2].subtract(poly[0]));
  if (n.lengthSquared() < 1e-12) return center.normalizeToNew();
  n.normalize();
  return Vector3.Dot(n, center) < 0 ? n.scale(-1) : n;
}
