import { expect, test } from "vitest";
import { lampsToEnable } from "./quality";

const lamps = [
  { name: "mood_lamp_0", x: -2.5 },
  { name: "mood_lamp_1", x: 2.5 },
  { name: "mood_lamp_2", x: -2.5 },
  { name: "mood_lamp_3", x: 2.5 },
  { name: "mood_lamp_4", x: -7 },
  { name: "mood_lamp_5", x: -11 },
  { name: "mood_lamp_6", x: -14 },
];

test("lab keeps its current lamps", () => {
  expect([...lampsToEnable(lamps, false, 2)]).toEqual([
    "mood_lamp_0",
    "mood_lamp_1",
  ]);
});

test("in the range the cap goes to range lamps, target lamp first", () => {
  expect([...lampsToEnable(lamps, true, 1)]).toEqual(["mood_lamp_6"]);
  expect([...lampsToEnable(lamps, true, 2)]).toEqual([
    "mood_lamp_6",
    "mood_lamp_4",
  ]);
  expect(lampsToEnable(lamps, true, 3).size).toBe(3);
});
