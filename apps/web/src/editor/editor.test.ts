import { afterEach, expect, test, vi } from "vitest";
import { MODEL_NAMES } from "../scene/labLayout";
import { api, readJson } from "./api";
import { layoutToConfig, modelLocation, parseSceneConfig } from "./sceneConfig";

afterEach(() => vi.unstubAllGlobals());

test("default layout converts to a valid config", () => {
  const config = layoutToConfig("lab");
  expect(config.objects).toHaveLength(MODEL_NAMES.length);
  const parsed = parseSceneConfig(JSON.parse(JSON.stringify(config)));
  expect(parsed.errors).toEqual([]);
  expect(
    parsed.config?.objects.find((o) => o.id === "info_panel")?.scale,
  ).toEqual([2, 2, 2]);
});

test("invalid configs are rejected with messages", () => {
  expect(parseSceneConfig(null).errors).toEqual([
    "Config must be a JSON object",
  ]);
  const { config, errors } = parseSceneConfig({
    name: "x",
    objects: [
      { id: "a", model: "m", scale: [0, 1, 1] },
      { id: "a", model: "m" },
      { id: "b", model: "m", position: [1, 2] },
    ],
  });
  expect(config).toBeNull();
  expect(errors.join("|")).toMatch(/scale.*\|.*duplicated.*\|.*position/);
});

test("model locations for builtin and uploaded models", () => {
  expect(modelLocation({ model: "lab_flask", source: "builtin" })).toEqual({
    rootUrl: "/models/",
    file: "lab_flask.glb",
  });
  expect(modelLocation({ model: "x", source: "uploaded" })).toEqual({
    rootUrl: "/api/models/x/",
    file: "model.glb",
  });
});

test("API errors surface the server detail", async () => {
  await expect(
    readJson(
      new Response(JSON.stringify({ detail: "Not a GLB file" }), {
        status: 422,
      }),
    ),
  ).rejects.toThrow("Not a GLB file");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify([{ id: 1, name: "a", objects: 0 }])),
      ),
  );
  expect(await api.listScenes()).toEqual([{ id: 1, name: "a", objects: 0 }]);
});
