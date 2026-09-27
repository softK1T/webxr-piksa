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
  for (const placement of layout) {
    if (scene.isDisposed) break;
    try {
      await loadModel(scene, placement);
    } catch (error) {
      console.error(`Model ${placement.model} failed`, error);
      progress.failed = [...progress.failed, placement.model];
    }
    progress.loaded += 1;
    onProgress({ ...progress });
  }
  return progress;
}
