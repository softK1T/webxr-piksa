import { expect, test } from "vitest";
import { GUIDE_CHARS, GUIDE_LINES } from "../scene/stepBoard";
import { STEPS } from "./scenario";
import { STEP_GUIDE, wrapText } from "./stepGuide";

test("every step has a guide that fits the board and names no colours", () => {
  for (const step of STEPS) {
    const text = STEP_GUIDE[step.id];
    expect(text, step.id).toBeTruthy();
    expect(wrapText(text, GUIDE_CHARS).length, step.id).toBeLessThanOrEqual(
      GUIDE_LINES,
    );
    expect(text).not.toMatch(
      /\b(red|green|blue|yellow|orange|brown|black|white|gr[ae]y|purple|pink)\b/i,
    );
  }
});

test("wrapText keeps words and line length", () => {
  const lines = wrapText("aa bb cc dd ee", 5);
  expect(lines).toEqual(["aa bb", "cc dd", "ee"]);
  expect(wrapText("", 10)).toEqual([]);
});
