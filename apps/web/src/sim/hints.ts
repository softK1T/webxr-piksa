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

export function hintTarget(
  step: StepId | null,
  held: string | null,
): HintTarget {
  switch (step) {
    case "open_panel":
      return { kind: "point", position: [0, 1.2, 3.5] };
    case "goggles_to_prep":
      return held === "safety_goggles" ? zone("prep_zone") : item("goggles");
    case "find_flask":
      return item("flask");
    case "flask_to_bench":
      return held === "lab_flask" ? zone("workbench_zone") : item("flask");
    case "tube_to_rack":
      return held === "test_tube" ? zone("rack_zone") : item("tube");
    case "select_container":
      return item("container_blue");
    case "toggle_lever":
      return item("lever");
    case "press_start":
      return item("button");
    default:
      return null;
  }
}
