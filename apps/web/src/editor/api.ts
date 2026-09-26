import { notifyUnauthorized } from "../auth/authApi";
import type { SceneConfigData } from "./sceneConfig";

export interface SceneSummary {
  id: number;
  name: string;
  objects: number;
}

export interface ModelInfo {
  meshes: number;
  triangles: number;
  materials: number;
}

export interface UploadedModel extends ModelInfo {
  name: string;
  size: number;
}

export type StoredScene = SceneConfigData & { id: number };

export async function readJson<T>(response: Response): Promise<T> {
  if (response.status === 401) notifyUnauthorized();
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      detail?: unknown;
    };
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : `Request failed (HTTP ${response.status})`;
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

const send = (url: string, method: string, body: BodyInit, type: string) =>
  fetch(url, { method, headers: { "Content-Type": type }, body });

export const api = {
  listScenes: async () => readJson<SceneSummary[]>(await fetch("/api/scenes")),
  getScene: async (id: number) =>
    readJson<StoredScene>(await fetch(`/api/scenes/${id}`)),
  saveScene: async (config: SceneConfigData, id?: number) =>
    readJson<StoredScene>(
      await send(
        id ? `/api/scenes/${id}` : "/api/scenes/import",
        id ? "PUT" : "POST",
        JSON.stringify(config),
        "application/json",
      ),
    ),
  listModels: async () => readJson<UploadedModel[]>(await fetch("/api/models")),
  validateModel: async (file: Blob) =>
    readJson<ModelInfo>(
      await send("/api/models/validate", "POST", file, "model/gltf-binary"),
    ),
  uploadModel: async (name: string, file: Blob) =>
    readJson<UploadedModel>(
      await send(
        `/api/models?name=${encodeURIComponent(name)}`,
        "POST",
        file,
        "model/gltf-binary",
      ),
    ),
};
