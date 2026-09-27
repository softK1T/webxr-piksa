import type { Vec3 } from "../scene/labLayout";
import type { StepId } from "./scenario";
import { DROP_ZONES } from "./zones";

export type HintTarget =
  { kind: "placement"; id: string } | { kind: "point"; position: Vec3 } | null;

const zone = (id: string): HintTarget => {
  const found = DROP_ZONES.find((z) => z.id === id);
  return found ? { kind: "point", position: found.center } : null;
};
const item = (id: string): HintTarget => ({ kind: "placement", id });

/** The yellow marker waits: players search first, help comes when stuck or after a mistake. */
export const HINT_DELAY_MS = 40_000;

export function hintTarget(
  step: StepId | null,
  held: string | null,
): HintTarget {
  switch (step) {
    case "open_panel":
      return item("parcel");
    case "goggles_to_prep":
      return held === "safety_goggles" ? null : item("goggles");
    case "find_flask":
      return item("sample_bottle");
    case "flask_to_bench":
      return held === "sample_bottle"
        ? item("erlenmeyer")
        : item("sample_bottle");
    case "fill_cuvette":
      return held === "erlenmeyer_flask" ? item("cuvette") : item("erlenmeyer");
    case "tube_to_rack":
      return held === "cuvette" ? zone("turbidimeter_socket") : item("cuvette");
    case "select_container":
      return item("buffer_ph7");
    case "toggle_lever":
      return item("pump");
    case "press_start":
      return item("ph_meter");
    default:
      return null;
  }
}
