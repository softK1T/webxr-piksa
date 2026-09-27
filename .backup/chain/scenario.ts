export const REQUIRED_CONTAINER = "colored_container_blue";

export const STEPS = [
  {
    id: "open_panel",
    title: "Read the briefing",
  },
  {
    id: "goggles_to_prep",
    title: "Put on your goggles",
  },
  { id: "find_flask", title: "Find the ordered sample" },
  {
    id: "flask_to_bench",
    title: "Take it to the measurement device",
  },
  { id: "tube_to_rack", title: "Rack the control tube" },
  {
    id: "select_container",
    title: "Pick the reagent from the order",
  },
  { id: "toggle_lever", title: "Power up the device" },
  { id: "press_start", title: "Run the analysis" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export type ScenarioEvent =
  | { type: "panel_opened" }
  | { type: "grabbed"; model: string; id?: string }
  | { type: "placed"; model: string; zone: string | null; id?: string }
  | { type: "selected"; model: string; id?: string }
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
  /** placement id of the flask named on the order form */
  sampleId: string;
  sampleNo: number;
}

export const initialScenario: ScenarioState = {
  completed: [],
  status: "idle",
  message: "Night shift. The order form is on the panel.",
  leverOn: false,
  mistakes: 0,
  sampleId: "flask",
  sampleNo: 7,
};

/** Five identical flasks, told apart only by the number on their tag. */
export const SAMPLE_FLASKS = [
  { id: "flask", no: 7 },
  { id: "flask_2", no: 3 },
  { id: "flask_3", no: 5 },
  { id: "flask_4", no: 8 },
  { id: "flask_5", no: 9 },
] as const;

/** New run with a random ordered sample. */
export function newScenario(rand: () => number = Math.random): ScenarioState {
  const f = SAMPLE_FLASKS[Math.floor(rand() * SAMPLE_FLASKS.length)];
  return { ...initialScenario, sampleId: f.id, sampleNo: f.no };
}

const isOtherFlask = (event: ScenarioEvent, state: ScenarioState) =>
  "model" in event &&
  event.model === "lab_flask" &&
  event.id !== undefined &&
  event.id !== state.sampleId;

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
      if (
        event.model === "safety_goggles" &&
        (event.zone === "face" || event.zone === "prep_zone")
      )
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
      message: `Not ready yet: ${missing[0].title.toLowerCase()}.`,
    };
  }
  return {
    ...state,
    completed: [...state.completed, "press_start"],
    status: "success",
    message: "Sample is clean. The range is open.",
  };
}

export function reduceScenario(
  state: ScenarioState,
  event: ScenarioEvent,
): ScenarioState {
  if (event.type === "reset")
    return {
      ...initialScenario,
      sampleId: state.sampleId,
      sampleNo: state.sampleNo,
    };
  if (state.status !== "success" && isOtherFlask(event, state)) {
    // picking flasks up to read their tags is fine; taking the wrong one to the device is not
    if (event.type === "placed" && event.zone === "workbench_zone")
      return {
        ...state,
        mistakes: state.mistakes + 1,
        message: `Wrong sample. The order says No. ${state.sampleNo}.`,
      };
    return state;
  }
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
      message: `Wrong reagent (${color}). Check the order form.`,
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
