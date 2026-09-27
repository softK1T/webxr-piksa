import { expect, test } from "vitest";
import { initialScenario } from "../sim/scenario";
import { equipmentView } from "./equipmentVisuals";

test("liquid moves bottle -> flask -> filtrate and screens follow the steps", () => {
  const start = equipmentView(initialScenario);
  expect(start).toMatchObject({
    bottle: 1,
    flask: 0,
    cuvette: 0,
    filtrate: 0,
    filterStained: false,
  });
  expect(start.turbidimeter).toBe("READY");
  expect(start.phMeter).toBe("CAL ---");
  const poured = equipmentView({ ...initialScenario, flaskFilled: true });
  expect(poured).toMatchObject({ bottle: 0, flask: 1 });
  const done = equipmentView({
    ...initialScenario,
    flaskFilled: true,
    calibrated: true,
    completed: ["tube_to_rack", "toggle_lever", "press_start"],
  });
  expect(done).toMatchObject({ cuvette: 1, filtrate: 1, filterStained: true });
  expect(done.flask).toBeLessThan(1);
  expect(done.turbidimeter).toMatch(/NTU$/);
  expect(
    equipmentView({ ...initialScenario, completed: ["tube_to_rack"] })
      .turbidimeter,
  ).toBe("E1 NO SAMPLE");
  expect(done.phMeter).not.toMatch(/^CAL/);
});
