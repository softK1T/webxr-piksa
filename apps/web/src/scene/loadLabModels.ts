import { Scene, SceneLoader, TransformNode } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { LAB_LAYOUT, type ModelPlacement } from "./labLayout";

export const MODELS_URL = "/models/";

export interface LoadProgress {
  loaded: number;
  total: number;
  failed: string[];
}

export interface ModelLocation {
  rootUrl: string;
  file: string;
}

export async function loadModel(
  scene: Scene,
  placement: ModelPlacement,
  location: ModelLocation = {
    rootUrl: MODELS_URL,
    file: `${placement.model}.glb`,
  },
  source: "builtin" | "uploaded" = "builtin",
): Promise<TransformNode> {
  const meta = { placementId: placement.id, model: placement.model, source };
  const anchor = new TransformNode(`place_${placement.id}`, scene);
  anchor.position.set(...placement.position);
  anchor.rotation.y = placement.rotationY ?? 0;
  anchor.scaling.setAll(placement.scale ?? 1);
  anchor.metadata = meta;
  try {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      location.rootUrl,
      location.file,
      scene,
    );
    result.meshes[0].parent = anchor;
    for (const node of result.transformNodes) {
      if (/_LOD[12]$/.test(node.name)) node.setEnabled(false);
    }
    for (const mesh of result.meshes) mesh.metadata = meta;
  } catch (error) {
    anchor.dispose();
    throw error;
  }
  return anchor;
}

export const MODEL_CONCURRENCY = 6;

/** Run fn over items with at most `limit` in flight; fn returning false stops new work. */
export async function mapLimit<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<boolean | void>,
): Promise<void> {
  let next = 0;
  let stop = false;
  const worker = async () => {
    while (!stop && next < items.length)
      if ((await fn(items[next++])) === false) stop = true;
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}

export async function loadLabModels(
  scene: Scene,
  onProgress: (progress: LoadProgress) => void,
  layout: readonly ModelPlacement[] = LAB_LAYOUT,
): Promise<LoadProgress> {
  const progress: LoadProgress = {
    loaded: 0,
    total: layout.length,
    failed: [],
  };
  // parallel downloads (bounded) instead of one-by-one: lower time-to-first-frame
  await mapLimit(
    layout,
    MODEL_CONCURRENCY,
    async (placement): Promise<boolean | void> => {
      if (scene.isDisposed) return false;
      try {
        await loadModel(scene, placement);
      } catch (error) {
        console.error(`Model ${placement.model} failed`, error);
        progress.failed = [...progress.failed, placement.model];
      }
      progress.loaded += 1;
      onProgress({ ...progress });
    },
  );
  return progress;
}
