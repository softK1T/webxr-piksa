import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test("scene config import, list and export round trip", async ({ page }) => {
  await register(page);
  const api = page.request;
  const config = { name: `e2e_scene_${Date.now()}`, objects: [] };
  const created = await api.post("/api/scenes/import", { data: config });
  expect(created.status(), await created.text()).toBe(201);
  const { id } = (await created.json()) as { id: number };

  const list = await api.get("/api/scenes");
  expect(list.ok()).toBe(true);
  const names = ((await list.json()) as { name: string }[]).map((s) => s.name);
  expect(names).toContain(config.name);

  const exported = await api.get(`/api/scenes/${id}/export`);
  expect(exported.ok()).toBe(true);
  expect(((await exported.json()) as { name: string }).name).toBe(config.name);

  const reimported = await api.post("/api/scenes/import", { data: config });
  expect(reimported.status()).toBe(201);
  expect(((await reimported.json()) as { id: number }).id).toBe(id);

  expect((await api.post("/api/scenes", { data: config })).status()).toBe(409);

  const bad = await api.post("/api/models/validate", {
    headers: { "Content-Type": "model/gltf-binary" },
    data: Buffer.from("not a glb"),
  });
  expect(bad.status()).toBeGreaterThanOrEqual(400);
});
