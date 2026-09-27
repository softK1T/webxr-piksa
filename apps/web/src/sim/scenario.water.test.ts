import { expect, test } from "vitest";
import {
  initialScenario,
  newScenario,
  reduceScenario,
  reportLines,
  TURBIDIMETER_ZONE,
  type ScenarioEvent,
} from "./scenario";
import { evaluate, seededRandom } from "./water";

const WATER_RUN: ScenarioEvent[] = [
  { type: "panel_opened" },
  { type: "placed", model: "safety_goggles", zone: "face" },
  { type: "grabbed", model: "sample_bottle" },
  { type: "poured", model: "sample_bottle", into: "erlenmeyer_flask" },
  { type: "placed", model: "cuvette", zone: TURBIDIMETER_ZONE },
  { type: "selected", model: "buffer_bottle_ph7" },
  { type: "lever", on: true },
  { type: "button" },
];

const run = (events: ScenarioEvent[], start = initialScenario) => events.reduce(reduceScenario, start);

test("parcel chain succeeds and the message carries the verdict", () => {
  const s = run(WATER_RUN);
  expect(s.status).toBe("success");
  expect(s.mistakes).toBe(0);
  expect(s.flaskFilled && s.calibrated).toBe(true);
  const verdict = evaluate(s.sample).verdict;
  expect(s.message).toContain(verdict === "not_drinkable" ? "NOT drinkable" : "drinkable");
  expect(reportLines(s).at(-1)).toMatch(/^VERDICT: /);
});

test("wrong calibration buffer is a mistake and does not count", () => {
  const s = run([...WATER_RUN.slice(0, 5), { type: "selected", model: "buffer_bottle_ph4" }]);
  expect(s.mistakes).toBe(1);
  expect(s.message).toBe("Wrong buffer (pH 4.01). Calibration needs pH 7.00.");
  expect(s.calibrated).toBe(false);
  expect(s.completed).not.toContain("select_container");
});

test("cuvette before pouring is out of order", () => {
  const s = run([...WATER_RUN.slice(0, 3), WATER_RUN[4]]);
  expect(s.mistakes).toBe(1);
  expect(s.message).toMatch(/^Not yet\. First: Pour the sample/);
});

test("pouring into anything but the flask does nothing", () => {
  const s = run([...WATER_RUN.slice(0, 3), { type: "poured", model: "sample_bottle", into: "floor" }]);
  expect(s.completed).not.toContain("flask_to_bench");
  expect(s.mistakes).toBe(0);
});

test("new run: sample comes from the seed; reset keeps the same sample", () => {
  const a = newScenario(seededRandom(5));
  const b = newScenario(seededRandom(5));
  expect(a.sample).toEqual(b.sample);
  const done = run(WATER_RUN, a);
  const again = reduceScenario(done, { type: "reset" });
  expect(again.sample).toEqual(a.sample);
  expect(again.completed).toEqual([]);
  expect(again.flaskFilled).toBe(false);
});
