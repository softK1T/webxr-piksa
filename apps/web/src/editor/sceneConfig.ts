import { LAB_LAYOUT, type ModelPlacement } from "../scene/labLayout";

export type Triple = [number, number, number];
export type ModelSource = "builtin" | "uploaded";

export interface SceneObjectConfig {
  id: string;
  model: string;
  source: ModelSource;
  position: Triple;
  rotation: Triple;
  scale: Triple;
}

export interface SceneConfigData {
  name: string;
  version: number;
  objects: SceneObjectConfig[];
}

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const round = (v: number) => Math.round(v * 1000) / 1000;
export const toDegrees = (rad: number) => round((rad * 180) / Math.PI);
export const toRadians = (deg: number) => (deg * Math.PI) / 180;

export function layoutToConfig(
  name = "default",
  layout: readonly ModelPlacement[] = LAB_LAYOUT,
): SceneConfigData {
  return {
    name,
    version: 1,
    objects: layout.map((p) => {
      const s = p.scale ?? 1;
      return {
        id: p.id,
        model: p.model,
        source: "builtin",
        position: [p.position[0], p.position[1], p.position[2]],
        rotation: [0, toDegrees(p.rotationY ?? 0), 0],
        scale: [s, s, s],
      };
    }),
  };
}

const isTriple = (v: unknown): v is Triple =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((n) => typeof n === "number" && Number.isFinite(n));

export function parseSceneConfig(raw: unknown): {
  config: SceneConfigData | null;
  errors: string[];
} {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object")
    return { config: null, errors: ["Config must be a JSON object"] };
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || !r.name.trim())
    errors.push("name is required");
  if (!Array.isArray(r.objects))
    return { config: null, errors: [...errors, "objects must be an array"] };
  const ids = new Set<string>();
  const objects: SceneObjectConfig[] = [];
  r.objects.forEach((item: unknown, i) => {
    const o = (item && typeof item === "object" ? item : {}) as Record<
      string,
      unknown
    >;
    const where = `objects[${i}]`;
    const id = typeof o.id === "string" ? o.id : "";
    const model = typeof o.model === "string" ? o.model : "";
    if (!IDENTIFIER.test(id)) errors.push(`${where}.id is invalid`);
    else if (ids.has(id)) errors.push(`${where}.id "${id}" is duplicated`);
    ids.add(id);
    if (!IDENTIFIER.test(model)) errors.push(`${where}.model is invalid`);
    const source = o.source === undefined ? "builtin" : o.source;
    if (source !== "builtin" && source !== "uploaded")
      errors.push(`${where}.source is invalid`);
    const position = o.position ?? [0, 0, 0];
    const rotation = o.rotation ?? [0, 0, 0];
    const scale = o.scale ?? [1, 1, 1];
    if (!isTriple(position)) errors.push(`${where}.position must be [x, y, z]`);
    if (!isTriple(rotation)) errors.push(`${where}.rotation must be [x, y, z]`);
    if (!isTriple(scale) || scale.some((v) => v <= 0))
      errors.push(`${where}.scale must be positive [x, y, z]`);
    if (isTriple(position) && isTriple(rotation) && isTriple(scale)) {
      objects.push({
        id,
        model,
        source: source as ModelSource,
        position,
        rotation,
        scale,
      });
    }
  });
  if (errors.length) return { config: null, errors };
  return {
    config: {
      name: String(r.name),
      version: typeof r.version === "number" ? r.version : 1,
      objects,
    },
    errors,
  };
}

export function modelLocation(
  obj: Pick<SceneObjectConfig, "model" | "source">,
) {
  return obj.source === "uploaded"
    ? { rootUrl: `/api/models/${obj.model}/`, file: "model.glb" }
    : { rootUrl: "/models/", file: `${obj.model}.glb` };
}
