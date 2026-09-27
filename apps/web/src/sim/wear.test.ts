import { expect, test } from "vitest";
import { reduceScenario, initialScenario } from "./scenario";

test("wearing goggles completes the goggles step", () => {
  let s = reduceScenario(initialScenario, { type: "panel_opened" });
  s = reduceScenario(s, {
    type: "placed",
    model: "safety_goggles",
    zone: "face",
  });
  expect(s.completed).toContain("goggles_to_prep");
});
