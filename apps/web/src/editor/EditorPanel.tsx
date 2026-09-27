import type { Scene } from "@babylonjs/core";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { MODEL_NAMES } from "../scene/labLayout";
import {
  api,
  type ModelInfo,
  type SceneSummary,
  type UploadedModel,
} from "./api";
import {
  modelLocation,
  parseSceneConfig,
  type ModelSource,
  type SceneObjectConfig,
  type Triple,
} from "./sceneConfig";
import {
  applyConfig,
  attachDrag,
  detachAllDrags,
  snapshot,
  spawnInFront,
  uniqueId,
  writeTransform,
} from "./sceneEditor";

interface Props {
  getScene(): Scene | null;
  onClose(): void;
}

type Field = "position" | "rotation" | "scale";
const FIELDS: { key: Field; label: string; step: number }[] = [
  { key: "position", label: "Position (m)", step: 0.05 },
  { key: "rotation", label: "Rotation (deg)", step: 5 },
  { key: "scale", label: "Scale", step: 0.1 },
];
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const download = (href: string, filename: string) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
};

export function EditorPanel({ getScene, onClose }: Props) {
  const [name, setName] = useState("default");
  const [sceneId, setSceneId] = useState<number | null>(null);
  const [objects, setObjects] = useState<SceneObjectConfig[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [scenes, setScenes] = useState<SceneSummary[]>([]);
  const [models, setModels] = useState<UploadedModel[]>([]);
  const [builtin, setBuiltin] = useState<string>(MODEL_NAMES[0]);
  const [pending, setPending] = useState<{
    file: File;
    name: string;
    info: ModelInfo;
  } | null>(null);
  const [status, setStatus] = useState("");

  const refresh = useCallback(() => {
    const scene = getScene();
    if (scene) setObjects(snapshot(scene, "").objects);
  }, [getScene]);

  const reloadLists = useCallback(() => {
    api
      .listScenes()
      .then(setScenes)
      .catch((e: unknown) => setStatus(message(e)));
    api
      .listModels()
      .then(setModels)
      .catch((e: unknown) => setStatus(message(e)));
  }, []);

  useEffect(() => {
    refresh();
    reloadLists();
  }, [refresh, reloadLists]);

  // Detach drags when panel unmounts
  useEffect(() => {
    return () => {
      const scene = getScene();
      if (scene) detachAllDrags(scene);
    };
  }, [getScene]);

  const selected = objects.find((o) => o.id === selectedId) ?? null;

  const update = (field: Field, axis: number, value: number) => {
    const scene = getScene();
    if (!scene || !selected || !Number.isFinite(value)) return;
    if (field === "scale" && value <= 0) return;
    const next = {
      ...selected,
      [field]: selected[field].map((v, i) =>
        i === axis ? value : v,
      ) as Triple,
    };
    writeTransform(scene, next);
    setObjects((list) => list.map((o) => (o.id === next.id ? next : o)));
  };

  const run = async (task: () => Promise<string | void>) => {
    try {
      const result = await task();
      if (result) setStatus(result);
    } catch (e) {
      setStatus(message(e));
    }
  };

  const current = () => {
    const scene = getScene();
    if (!scene) throw new Error("Scene is not ready");
    return { scene, config: snapshot(scene, name) };
  };

  const applyParsed = async (raw: unknown) => {
    const { config, errors } = parseSceneConfig(raw);
    if (!config) throw new Error(errors.join("; "));
    const { scene } = current();
    const failed = await applyConfig(scene, config);
    // Re-attach drags for all newly placed objects
    for (const obj of config.objects) {
      const anchor = scene.getTransformNodeByName(`place_${obj.id}`);
      if (anchor) attachDrag(scene, anchor, refresh);
    }
    setName(config.name);
    refresh();
    return failed.length
      ? `Loaded with errors, missing: ${failed.join(", ")}`
      : `Loaded "${config.name}"`;
  };

  const save = () =>
    run(async () => {
      const stored = await api.saveScene(
        current().config,
        sceneId ?? undefined,
      );
      setSceneId(stored.id);
      reloadLists();
      return `Saved "${stored.name}"`;
    });

  const load = (id: number) =>
    run(async () => {
      const stored = await api.getScene(id);
      const result = await applyParsed(stored);
      setSceneId(stored.id);
      return result;
    });

  const exportJson = () =>
    run(async () => {
      const blob = new Blob([JSON.stringify(current().config, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      download(url, `${name || "scene"}.json`);
      URL.revokeObjectURL(url);
      return "Exported JSON";
    });

  const importJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void run(async () => {
      const result = await applyParsed(JSON.parse(await file.text()));
      setSceneId(null);
      return result;
    });
  };

  const chooseGlb = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPending(null);
    void run(async () => {
      const info = await api.validateModel(file);
      const base =
        file.name
          .replace(/\.glb$/i, "")
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .slice(0, 64) || "model";
      setPending({ file, name: base, info });
      return `Valid GLB: ${info.meshes} meshes, ${info.triangles} triangles, ${info.materials} materials`;
    });
  };

  const upload = () =>
    run(async () => {
      if (!pending) return;
      const model = await api.uploadModel(pending.name, pending.file);
      setPending(null);
      reloadLists();
      return `Uploaded "${model.name}"`;
    });

  const addModel = (model: string, source: ModelSource) =>
    run(async () => {
      const { scene } = current();
      const id = uniqueId(scene, model);
      // Spawn 2 m in front of the camera at floor level
      const pos = spawnInFront(scene);
      const obj: SceneObjectConfig = {
        id,
        model,
        source,
        position: pos,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };
      const failed = await applyConfig(scene, {
        name,
        version: 1,
        objects: [obj],
      });
      if (failed.length) throw new Error(`Failed to load ${model}`);
      // Attach drag to the new anchor so user can drag it with the mouse
      const anchor = scene.getTransformNodeByName(`place_${id}`);
      if (anchor) attachDrag(scene, anchor, refresh);
      refresh();
      setSelectedId(id);
      return `Added ${id}`;
    });

  const remove = () =>
    run(async () => {
      const { scene } = current();
      if (!selected) return;
      scene.getTransformNodeByName(`place_${selected.id}`)?.dispose();
      setSelectedId("");
      refresh();
      return `Removed ${selected.id}`;
    });

  const handleClose = () => {
    const scene = getScene();
    if (scene) detachAllDrags(scene);
    onClose();
  };

  return (
    <aside className="editor-panel" aria-label="Scene editor">
      <header>
        <h2>Scene editor</h2>
        <button onClick={handleClose}>Close</button>
      </header>

      <section>
        <label>
          Scene name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="row">
          <button onClick={save}>Save</button>
          <button onClick={exportJson}>Export JSON</button>
          <label className="file">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={importJson}
            />
          </label>
        </div>
        {scenes.length > 0 && (
          <label>
            Load saved scene
            <select
              value=""
              onChange={(e) =>
                e.target.value && void load(Number(e.target.value))
              }
            >
              <option value="">Choose...</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.objects} objects)
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section>
        <label>
          Object
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Choose...</option>
            {objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} ({o.model})
              </option>
            ))}
          </select>
        </label>
        {selected &&
          FIELDS.map((f) => (
            <fieldset key={f.key}>
              <legend>{f.label}</legend>
              {selected[f.key].map((v, axis) => (
                <input
                  key={axis}
                  type="number"
                  aria-label={`${f.key} ${"xyz"[axis]}`}
                  step={f.step}
                  value={Math.round(v * 1000) / 1000}
                  onChange={(e) => update(f.key, axis, Number(e.target.value))}
                />
              ))}
            </fieldset>
          ))}
        {selected && <button onClick={remove}>Remove object</button>}
      </section>

      <section>
        <label>
          Add built-in model
          <select value={builtin} onChange={(e) => setBuiltin(e.target.value)}>
            {MODEL_NAMES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <div className="row">
          <button onClick={() => addModel(builtin, "builtin")}>Add</button>
          <button
            onClick={() =>
              download(
                `${modelLocation({ model: builtin, source: "builtin" }).rootUrl}${builtin}.glb`,
                `${builtin}.glb`,
              )
            }
          >
            Export GLB
          </button>
        </div>
      </section>

      <section>
        <label className="file">
          Upload GLB (validated before upload)
          <input
            type="file"
            accept=".glb,model/gltf-binary"
            onChange={chooseGlb}
          />
        </label>
        {pending && (
          <div className="row">
            <input
              aria-label="Model name"
              value={pending.name}
              onChange={(e) =>
                setPending({ ...pending, name: e.target.value.toLowerCase() })
              }
            />
            <button onClick={upload}>Upload</button>
          </div>
        )}
        {models.map((m) => (
          <div className="row model" key={m.name}>
            <span>
              {m.name} ({m.triangles} tris)
            </span>
            <button onClick={() => addModel(m.name, "uploaded")}>Add</button>
            <button
              onClick={() =>
                download(`/api/models/${m.name}/model.glb`, `${m.name}.glb`)
              }
            >
              GLB
            </button>
          </div>
        ))}
      </section>

      {status && (
        <p role="status" className="muted">
          {status}
        </p>
      )}
    </aside>
  );
}
