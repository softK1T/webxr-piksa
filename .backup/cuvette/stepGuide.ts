import type { StepId } from "./scenario";

/** What exactly to do in each step (shown on the wall board). Never name colours. */
export const STEP_GUIDE: Record<StepId, string> = {
  open_panel:
    "Go to the Delivery zone by the door. Click the parcel (VR: point and pull the trigger) to open the lid. The owner's request is at the top of this board.",
  goggles_to_prep:
    "Safety station, top shelf: take the goggles, bring them to your face and let go (desktop: release while they hang in front of you). Unknown liquid - protect your eyes.",
  find_flask:
    "Take the well water bottle out of the opened parcel (VR: grip, desktop: click). Keep holding it.",
  flask_to_bench:
    "Carry the bottle to the Pouring bench. Hold it just above the mouth of the lab flask and tilt it past 60 degrees. Desktop: click the flask while holding the bottle.",
  tube_to_rack:
    "Take the cuvette from the Pouring bench and put it on the Turbidimeter well pad (Analysis bench). The screen shows turbidity in NTU, drinking limit 1 NTU. E1 NO SAMPLE: the flask is empty.",
  select_container:
    "Pick BUFFER pH 7.00 on the Analysis bench to calibrate the pH meter. pH 4.01 and pH 10.01 are the wrong buffers for this run. Meter screen: CAL 7.00 OK.",
  toggle_lever:
    "Switch on the vacuum pump next to the filtration set (click the pump). Water is drawn through the filter paper into the receiving flask; the residue stays on the filter.",
  press_start:
    "Press MEASURE on the pH meter (click the meter). The screen shows pH and conductivity in uS/cm. This board then shows the test report and the verdict.",
};

/** Greedy word wrap by character count (no canvas needed, testable). */
export function wrapText(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
