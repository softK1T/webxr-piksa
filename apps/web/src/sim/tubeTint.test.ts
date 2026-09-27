import { expect, test } from "vitest";
import { tubeColor } from "./tubeTint";

test("tube is empty, then filled with the sample, then buffered", () => {
  expect(tubeColor({ completed: [] })).toBeNull();
  const filled = tubeColor({ completed: ["flask_to_bench"] });
  const buffered = tubeColor({
    completed: ["flask_to_bench", "select_container"],
  });
  expect(filled).not.toBeNull();
  expect(buffered).not.toEqual(filled);
});
