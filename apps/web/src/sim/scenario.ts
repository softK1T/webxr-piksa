export const REQUIRED_CONTAINER = "colored_container_blue";

export const STEPS = [
  { id: "open_panel", title: "Open the information panel" },
  {
    id: "goggles_to_prep",
    title: "Put the safety goggles in the preparation zone",
  },
  { id: "find_flask", title: "Find the lab flask" },
  { id: "flask_to_bench", title: "Carry the flask to the workbench zone" },
  { id: "tube_to_rack", title: "Put the test tube into the rack" },
  { id: "select_container", title: "Select the blue container" },
  { id: "toggle_lever", title: "Switch the lever on" },
  { id: "press_start", title: "Press the start button" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export type ScenarioEvent =
  | { type: "panel_opened" }
  | { type: "grabbed"; model: string }
  | { type: "placed"; model: string; zone: string | null }
  | { type: "selected"; model: string }
  | { type: "lever"; on: boolean }
  | { type: "button" }
  | { type: "reset" };

export type ScenarioStatus = "idle" | "running" | "success" | "failed";

export interface ScenarioState {
  completed: StepId[];
  status: ScenarioStatus;
  message: string;
  leverOn: boolean;
  mistakes: number;
}

export const initialScenario: ScenarioState = {
  completed: [],
  status: "idle",
  message: "Open the information panel to begin.",
  leverOn: false,
  mistakes: 0,
};

const title = (id: StepId) => STEPS.find((s) => s.id === id)?.title ?? id;

export function nextStep(
  state: Pick<ScenarioState, "completed">,
): StepId | null {
  return STEPS.find((s) => !state.completed.includes(s.id))?.id ?? null;
}

function stepFor(event: ScenarioEvent): StepId | null {
  switch (event.type) {
    case "panel_opened":
      return "open_panel";
    case "placed":
      if (event.model === "safety_goggles" && event.zone === "prep_zone")
        return "goggles_to_prep";
      if (event.model === "lab_flask" && event.zone === "workbench_zone")
        return "flask_to_bench";
      if (event.model === "test_tube" && event.zone === "rack_zone")
        return "tube_to_rack";
      return null;
    case "grabbed":
      return event.model === "lab_flask" ? "find_flask" : null;
    case "selected":
      if (event.model === "lab_flask") return "find_flask";
      return event.model === REQUIRED_CONTAINER ? "select_container" : null;
    case "lever":
      return event.on ? "toggle_lever" : null;
    default:
      return null;
  }
}

function validate(state: ScenarioState): ScenarioState {
  const missing = STEPS.filter(
    (s) => s.id !== "press_start" && !state.completed.includes(s.id),
  );
  if (missing.length > 0) {
    return {
      ...state,
      status: "failed",
      mistakes: state.mistakes + 1,
      message: `Sequence incomplete. Missing step: ${missing[0].title}.`,
    };
  }
  return {
    ...state,
    completed: [...state.completed, "press_start"],
    status: "success",
    message: "Experiment completed successfully!",
  };
}

export function reduceScenario(
  state: ScenarioState,
  event: ScenarioEvent,
): ScenarioState {
  if (event.type === "reset") return initialScenario;
  if (state.status === "success") return state;
  let s = state;
  if (event.type === "lever") {
    s = { ...s, leverOn: event.on };
    if (!event.on)
      s = { ...s, completed: s.completed.filter((c) => c !== "toggle_lever") };
  }
  if (event.type === "button") return validate(s);
  if (
    event.type === "selected" &&
    event.model.startsWith("colored_container_") &&
    event.model !== REQUIRED_CONTAINER
  ) {
    const color = event.model.replace("colored_container_", "");
    return {
      ...s,
      status: "running",
      mistakes: s.mistakes + 1,
      message: `Wrong container (${color}). Select the blue container.`,
    };
  }
  const step = stepFor(event);
  if (!step || s.completed.includes(step)) return s;
  const expected = nextStep(s);
  if (expected && step !== expected) {
    return {
      ...s,
      status: "running",
      mistakes: s.mistakes + 1,
      message: `Not yet. First: ${title(expected)}.`,
    };
  }
  const completed = [...s.completed, step];
  const upcoming = nextStep({ completed });
  return {
    ...s,
    completed,
    status: "running",
    message: upcoming ? `Next: ${title(upcoming)}.` : "",
  };
}
