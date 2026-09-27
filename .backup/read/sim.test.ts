import { Mesh, NullEngine, Scene, TransformNode } from "@babylonjs/core";
import { afterEach, expect, test } from "vitest";
import { TABLE_HEIGHT } from "../scene/labLayout";
import { GrabSystem } from "./grab";
import {
  initialScenario,
  reduceScenario,
  type ScenarioEvent,
  type ScenarioState,
} from "./scenario";
import { DROP_ZONES, findZone } from "./zones";
import { LAB_LAYOUT } from "../scene/labLayout";

const run = (events: ScenarioEvent[], start: ScenarioState = initialScenario) =>
  events.reduce(reduceScenario, start);

const HAPPY: ScenarioEvent[] = [
  { type: "panel_opened" },
  { type: "placed", model: "safety_goggles", zone: "face" },
  { type: "grabbed", model: "sample_bottle" },
  { type: "poured", model: "sample_bottle", into: "erlenmeyer_flask" },
  { type: "poured", model: "erlenmeyer_flask", into: "cuvette" },
  { type: "placed", model: "cuvette", zone: "turbidimeter_socket" },
  { type: "selected", model: "buffer_bottle_ph7" },
  { type: "lever", on: true },
  { type: "button" },
];

test("full procedure succeeds", () => {
  const s = run(HAPPY);
  expect(s.status).toBe("success");
  expect(s.completed).toHaveLength(9);
});

test("pressing start early fails with a hint", () => {
  const s = run([{ type: "panel_opened" }, { type: "button" }]);
  expect(s.status).toBe("failed");
  expect(s.message).toContain("put on your goggles");
});

test("out-of-order action gives a hint and is not counted", () => {
  const s = run([
    { type: "panel_opened" },
    { type: "poured", model: "erlenmeyer_flask", into: "cuvette" },
    { type: "placed", model: "cuvette", zone: "turbidimeter_socket" },
  ]);
  expect(s.completed).toEqual(["open_panel"]);
  expect(s.message).toMatch(/^Not yet/);
});

test("wrong container is reported", () => {
  const s = run([
    ...HAPPY.slice(0, 5),
    { type: "selected", model: "buffer_bottle_ph4" },
  ]);
  expect(s.message).toContain("Wrong buffer");
  expect(s.completed).not.toContain("select_container");
});

test("switching the lever off removes the step", () => {
  const s = run([
    ...HAPPY.slice(0, 7),
    { type: "lever", on: false },
    { type: "button" },
  ]);
  expect(s.status).toBe("failed");
  expect(s.leverOn).toBe(false);
});

test("zones accept only their items", () => {
  expect(findZone([-2.55, 1.2, 0.85], "safety_goggles")).toBeNull();
  expect(findZone([2.5, 1.2, 0.84], "cuvette")?.id).toBe("turbidimeter_socket");
  expect(findZone([-2.55, 1.2, 0.85], "lab_flask")).toBeNull();
  expect(findZone([0, 1, 0], "safety_goggles")).toBeNull();
});

const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach((e) => e.dispose()));

function setup() {
  const engine = new NullEngine();
  engines.push(engine);
  const scene = new Scene(engine);
  const anchor = new TransformNode("place_cuvette", scene);
  anchor.position.set(-1.4, TABLE_HEIGHT, 0.8);
  const mesh = new Mesh("cuvette_mesh", scene);
  mesh.parent = anchor;
  mesh.metadata = { placementId: "cuvette", model: "cuvette" };
  const hand = new TransformNode("hand", scene);
  hand.position.set(-1.4, 1.0, 0.8);
  const events: ScenarioEvent[] = [];
  return {
    scene,
    anchor,
    mesh,
    hand,
    events,
    grab: new GrabSystem(scene, (e) => events.push(e)),
  };
}

test("grab and release into a zone snaps the item", () => {
  const { anchor, mesh, hand, events, grab } = setup();
  expect(grab.grab(mesh, hand, "left")).toBe(true);
  hand.position.set(2.5, 1.0, 0.84);
  expect(grab.release("left")).toBe("turbidimeter_socket");
  expect(anchor.position.x).toBeCloseTo(2.5);
  expect(anchor.position.z).toBeCloseTo(0.84);
  expect(events.map((e) => e.type)).toEqual(["grabbed", "placed"]);
});

test("release outside a zone drops the item where it was let go", () => {
  const { anchor, mesh, hand, grab } = setup();
  grab.grab(mesh, hand, "right");
  hand.position.set(3, 1.5, -2);
  expect(grab.release("left")).toBeNull();
  expect(grab.release("right")).toBeNull();
  expect(grab.holding).toBe(false);
  expect(grab.falling).toBe(1);
  grab.settle();
  expect(grab.falling).toBe(0);
  expect(anchor.position.x).toBeCloseTo(3);
  expect(anchor.position.z).toBeCloseTo(-2);
  expect(anchor.position.y).toBeCloseTo(0);
});

test("drop zones do not overlap and flask does not start inside its target", () => {
  for (const a of DROP_ZONES)
    for (const b of DROP_ZONES) {
      if (a === b) continue;
      const apart = [0, 2].some(
        (i) => Math.abs(a.center[i] - b.center[i]) > a.half[i] + b.half[i],
      );
      expect(apart, `${a.id} vs ${b.id}`).toBe(true);
    }
  const flask = LAB_LAYOUT.find((p) => p.id === "erlenmeyer")!;
  expect(findZone(flask.position, "erlenmeyer_flask")).toBeNull();
  const cuvette = LAB_LAYOUT.find((p) => p.id === "cuvette")!;
  expect(findZone(cuvette.position, "cuvette")).toBeNull();
});

test("wrist panel text follows the next step", async () => {
  const { taskText } = await import("./wristPanel");
  expect(taskText(initialScenario).head).toBe("TASK 1 / 9");
  expect(taskText({ ...initialScenario, status: "success" }).body).toBe(
    "All tasks done",
  );
});

test("third extinguisher spray in a row starts a foam party", async () => {
  const { createSprayCounter } = await import("./extinguisher");
  let now = 0;
  const count = createSprayCounter(() => now);
  expect([count(), count(), count()]).toEqual(["spray", "spray", "party"]);
  now = 10_000;
  expect(count()).toBe("spray");
  now = 20_000;
  expect(count()).toBe("spray");
});

test("blaster only breaks glassware", async () => {
  const { isBlasterTarget } = await import("./blaster");
  expect(isBlasterTarget("erlenmeyer_flask")).toBe(true);
  expect(isBlasterTarget("cuvette")).toBe(true);
  expect(isBlasterTarget("turbidimeter")).toBe(false);
  expect(isBlasterTarget(null)).toBe(false);
});

test("extinguisher is grabbable and foam recycles old blobs", async () => {
  const { GRABBABLE } = await import("./grab");
  const { nextBlobSlot } = await import("./extinguisher");
  expect(GRABBABLE.has("fire_extinguisher")).toBe(true);
  expect(nextBlobSlot(5, 0, 10)).toEqual({ reuse: false, index: 5 });
  expect(nextBlobSlot(10, 13, 10)).toEqual({ reuse: true, index: 3 });
});

test("blaster model: grip at the hand, muzzle forward, realistic size", async () => {
  const { GUN_PARTS, MUZZLE_LOCAL } = await import("./blaster");
  const grip = GUN_PARTS.find((p) => p.name === "grip")!;
  expect(Math.hypot(...grip.pos)).toBeLessThan(0.01);
  expect(MUZZLE_LOCAL.z).toBeGreaterThan(0.14);
  expect(MUZZLE_LOCAL.y).toBeGreaterThan(0.05);
  const zs = GUN_PARTS.map((p) => p.pos[2]);
  expect(Math.max(...zs) - Math.min(...zs)).toBeLessThan(0.3);
});

test("range: ring scores and the hidden button sits under the sample bench", async () => {
  const { ringScore, RANGE, TARGET_RADIUS } = await import("./range");
  expect(ringScore(0)).toBe(10);
  expect(ringScore(TARGET_RADIUS * 0.55)).toBe(5);
  expect(ringScore(TARGET_RADIUS + 0.01)).toBe(0);
  const [x, y, z] = RANGE.button;
  expect(x > -2.9 && x < -1.1 && y < 0.9 && z < 0.6).toBe(true);
  expect(RANGE.x1).toBe(-5);
});

test("blaster and range build in a headless scene", async () => {
  const { NullEngine, Scene, MeshBuilder } = await import("@babylonjs/core");
  const { createBlaster } = await import("./blaster");
  const { createShootingRange } = await import("./range");
  const scene = new Scene(new NullEngine());
  const wall = MeshBuilder.CreateBox(
    "wall_w",
    { width: 0.1, height: 3, depth: 8 },
    scene,
  );
  wall.position.x = -5.05;
  wall.computeWorldMatrix(true);
  const range = createShootingRange(scene, { onToast: () => {} });
  const blaster = createBlaster(scene, {
    onHit: () => {},
    onRayHit: range.hit,
  });
  blaster.setEnabled(true);
  expect(scene.getMeshByName("range_door")).not.toBeNull();
  expect(scene.getMeshByName("range_wall_lintel")).not.toBeNull();
  expect(scene.getMeshByName("blaster_carbon")).not.toBeNull();
  range.press();
  expect(range.doorOpen).toBe(true);
});

test("lighting: props cast shadows, room shell and effects do not", async () => {
  const { shouldCastShadow } = await import("../scene/lighting");
  expect(shouldCastShadow("lab_flask_primitive0")).toBe(true);
  expect(shouldCastShadow("range_bench")).toBe(true);
  expect(shouldCastShadow("floor")).toBe(false);
  expect(shouldCastShadow("range_wall_north")).toBe(false);
  expect(shouldCastShadow("foam_12")).toBe(false);
});

test("room textures map meshes to texture sets", async () => {
  const { textureSetFor } = await import("../scene/textures");
  expect(textureSetFor("floor")).toBeNull();
  expect(textureSetFor("wall_north")).toBe("plaster");
  expect(textureSetFor("range_wall_s")).toBe("plaster");
  expect(textureSetFor("range_wall_north")).toBe("blocks");
  expect(textureSetFor("range_door")).toBe("metal_door");
  expect(textureSetFor("table_a")).toBe("oak");
  expect(textureSetFor("lab_flask")).toBeNull();
});

test("soviet lamps: several fixtures, some faulty, one calm glow colour", async () => {
  const { LAMPS, INTERACTION_GLOW } = await import("../scene/lighting");
  expect(LAMPS.length).toBeGreaterThanOrEqual(6);
  expect(LAMPS.some((l) => l.faulty)).toBe(true);
  expect(INTERACTION_GLOW.r).toBeGreaterThan(INTERACTION_GLOW.b);
});

test("lamp audio degrades to a silent no-op without Web Audio", async () => {
  const { NullEngine, Scene } = await import("@babylonjs/core");
  const { createLampAudio, HUM_HZ } = await import("../scene/lampAudio");
  const a = createLampAudio(new Scene(new NullEngine()), [[0, 2.7, 0]]);
  expect(HUM_HZ).toBe(100);
  expect(() => {
    a.level(0, 1);
    a.click(0);
    a.dispose();
  }).not.toThrow();
});

test("low-poly: props get faceted, room shells and dense meshes do not", async () => {
  const { shouldFacet } = await import("../scene/lowpoly");
  expect(shouldFacet("lab_flask_primitive0", 800, false)).toBe(true);
  expect(shouldFacet("wall_north", 24, false)).toBe(false);
  expect(shouldFacet("microscope", 50000, false)).toBe(false);
  expect(shouldFacet("foam_blob", 60, true)).toBe(false);
});

test("bevel box: 26 facets, same winding as Babylon boxes, correct size", async () => {
  const { NullEngine, Scene, MeshBuilder, Vector3 } =
    await import("@babylonjs/core");
  const { createBevelBox } = await import("../scene/bevelBox");
  const scene = new Scene(new NullEngine());
  const sign = (m: import("@babylonjs/core").Mesh) => {
    const p = m.getVerticesData("position")!;
    const n = m.getVerticesData("normal")!;
    const i = m.getIndices()!;
    const v = (k: number) => new Vector3(p[k * 3], p[k * 3 + 1], p[k * 3 + 2]);
    const face = Vector3.Cross(
      v(i[1]).subtract(v(i[0])),
      v(i[2]).subtract(v(i[0])),
    );
    return Math.sign(
      Vector3.Dot(
        face,
        new Vector3(n[i[0] * 3], n[i[0] * 3 + 1], n[i[0] * 3 + 2]),
      ),
    );
  };
  const ref = MeshBuilder.CreateBox("ref", { size: 1 }, scene);
  const bev = createBevelBox(
    "bev",
    { width: 1, height: 0.5, depth: 0.3, bevel: 0.05 },
    scene,
  );
  expect(sign(bev)).toBe(sign(ref));
  expect(bev.getIndices()!.length / 3).toBe(6 * 2 + 12 * 2 + 8);
  bev.refreshBoundingInfo();
  const ext = bev.getBoundingInfo().boundingBox.extendSize;
  expect(ext.x).toBeCloseTo(0.5);
  expect(ext.y).toBeCloseTo(0.25);
  expect(ext.z).toBeCloseTo(0.15);
});
