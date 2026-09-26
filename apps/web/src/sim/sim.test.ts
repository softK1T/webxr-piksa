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
  { type: "placed", model: "safety_goggles", zone: "prep_zone" },
  { type: "grabbed", model: "lab_flask" },
  { type: "placed", model: "lab_flask", zone: "workbench_zone" },
  { type: "placed", model: "test_tube", zone: "rack_zone" },
  { type: "selected", model: "colored_container_blue" },
  { type: "lever", on: true },
  { type: "button" },
];

test("full procedure succeeds", () => {
  const s = run(HAPPY);
  expect(s.status).toBe("success");
  expect(s.completed).toHaveLength(8);
});

test("pressing start early fails with a hint", () => {
  const s = run([{ type: "panel_opened" }, { type: "button" }]);
  expect(s.status).toBe("failed");
  expect(s.message).toContain("safety goggles");
});

test("out-of-order action gives a hint and is not counted", () => {
  const s = run([
    { type: "panel_opened" },
    { type: "placed", model: "test_tube", zone: "rack_zone" },
  ]);
  expect(s.completed).toEqual(["open_panel"]);
  expect(s.message).toMatch(/^Not yet/);
});

test("wrong container is reported", () => {
  const s = run([
    ...HAPPY.slice(0, 5),
    { type: "selected", model: "colored_container_red" },
  ]);
  expect(s.message).toContain("Wrong container (red)");
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
  expect(findZone([-2.5, 1.2, 0.45], "safety_goggles")?.id).toBe("prep_zone");
  expect(findZone([-2.5, 1.2, 0.45], "lab_flask")).toBeNull();
  expect(findZone([0, 1, 0], "safety_goggles")).toBeNull();
});

const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach((e) => e.dispose()));

function setup() {
  const engine = new NullEngine();
  engines.push(engine);
  const scene = new Scene(engine);
  const anchor = new TransformNode("place_tube", scene);
  anchor.position.set(-1.4, TABLE_HEIGHT, 0.8);
  const mesh = new Mesh("tube_mesh", scene);
  mesh.parent = anchor;
  mesh.metadata = { placementId: "tube", model: "test_tube" };
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
  hand.position.set(-1.9, 1.0, 1.1);
  expect(grab.release("left")).toBe("rack_zone");
  expect(anchor.position.x).toBeCloseTo(-1.9);
  expect(anchor.position.z).toBeCloseTo(1.1);
  expect(events.map((e) => e.type)).toEqual(["grabbed", "placed"]);
});

test("release outside a zone returns the item home", () => {
  const { anchor, mesh, hand, grab } = setup();
  grab.grab(mesh, hand, "right");
  hand.position.set(3, 1.5, -2);
  expect(grab.release("left")).toBeNull();
  expect(grab.release("right")).toBeNull();
  expect(anchor.position.x).toBeCloseTo(-1.4);
  expect(grab.holding).toBe(false);
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
  const flask = LAB_LAYOUT.find((p) => p.id === "flask")!;
  expect(findZone(flask.position, "lab_flask")).toBeNull();
  const tube = LAB_LAYOUT.find((p) => p.id === "tube")!;
  expect(findZone(tube.position, "test_tube")).toBeNull();
});
