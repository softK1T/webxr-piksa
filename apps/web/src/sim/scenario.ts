import {
  BUFFER_PH,
  evaluate,
  formatReport,
  isCalibrationBuffer,
  newSample,
  seededRandom,
  type Verdict,
  type WaterSample,
} from "./water";

/** Legacy scene props (old flask/tube/container layout) still map onto the same steps
 *  until the scene is migrated to the parcel equipment. Remove with the old props. */
export const REQUIRED_CONTAINER = "colored_container_blue";
export const REQUIRED_BUFFER = "buffer_bottle_ph7";
export const TURBIDIMETER_ZONE = "turbidimeter_socket";

// Step ids are fixed by PLAN section 9; titles describe the water-analysis chain.
export const STEPS = [
  { id: "open_panel", title: "Open the parcel and read the note" },
  { id: "goggles_to_prep", title: "Put on your goggles" },
  { id: "find_flask", title: "Take the sample bottle" },
  { id: "flask_to_bench", title: "Pour the sample into the flask" },
  { id: "tube_to_rack", title: "Measure turbidity in the turbidimeter" },
  { id: "select_container", title: "Calibrate the pH meter at pH 7.00" },
  { id: "toggle_lever", title: "Filter the sample: start the vacuum pump" },
  { id: "press_start", title: "Measure pH and conductivity" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export type ScenarioEvent =
  | { type: "panel_opened" }
  | { type: "grabbed"; model: string; id?: string }
  | { type: "placed"; model: string; zone: string | null; id?: string }
  | { type: "poured"; model: string; into: string; id?: string }
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
  /** legacy: placement id of the flask named on the old order form */
  sampleId: string;
  sampleNo: number;
  /** seed of the water sample; the same seed replays the same readings */
  seed: number;
  sample: WaterSample;
  flaskFilled: boolean;
  calibrated: boolean;
}

const DEFAULT_SEED = 1;

export const initialScenario: ScenarioState = {
  completed: [],
  status: "idle",
  message: "Night shift. A parcel is waiting by the door.",
  leverOn: false,
  mistakes: 0,
  sampleId: "flask",
  sampleNo: 7,
  seed: DEFAULT_SEED,
  sample: newSample(seededRandom(DEFAULT_SEED)),
  flaskFilled: false,
  calibrated: false,
};

/** Legacy: five identical flasks, told apart only by the number on their tag. */
export const SAMPLE_FLASKS = [
  { id: "flask", no: 7 },
  { id: "flask_2", no: 3 },
  { id: "flask_3", no: 5 },
  { id: "flask_4", no: 8 },
  { id: "flask_5", no: 9 },
] as const;

/** New run: random water sample (and legacy flask). */
export function newScenario(rand: () => number = Math.random): ScenarioState {
  const f = SAMPLE_FLASKS[Math.floor(rand() * SAMPLE_FLASKS.length)];
  const seed = Math.floor(rand() * 0x100000000);
  return {
    ...initialScenario,
    sampleId: f.id,
    sampleNo: f.no,
    seed,
    sample: newSample(seededRandom(seed)),
  };
}

/** Lines for the information panel once the analysis is finished. */
export function reportLines(state: Pick<ScenarioState, "sample">): string[] {
  return formatReport(state.sample);
}

const VERDICT_SHORT: Record<Verdict, string> = {
  drinkable: "water is drinkable",
  drinkable_after_filtration: "drinkable only after filtration",
  not_drinkable: "water is NOT drinkable",
};

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
      if (event.model === "cuvette" && event.zone === TURBIDIMETER_ZONE)
        return "tube_to_rack";
      if (event.model === "test_tube" && event.zone === "rack_zone")
        return "tube_to_rack";
      return null;
    case "poured":
      return event.model === "sample_bottle" && event.into === "erlenmeyer_flask"
        ? "flask_to_bench"
        : null;
    case "grabbed":
      return event.model === "sample_bottle" || event.model === "lab_flask"
        ? "find_flask"
        : null;
    case "selected":
      if (event.model === "lab_flask") return "find_flask";
      return event.model === REQUIRED_BUFFER || event.model === REQUIRED_CONTAINER
        ? "select_container"
        : null;
    case "lever":
      return event.on ? "toggle_lever" : null;
    default:
      return null;
  }
}

function wrongChoice(event: ScenarioEvent): string | null {
  if (event.type !== "selected") return null;
  if (event.model.startsWith("buffer_bottle_") && !isCalibrationBuffer(event.model)) {
    const ph = (BUFFER_PH as Record<string, number>)[event.model];
    return `Wrong buffer (pH ${ph?.toFixed(2) ?? "?"}). Calibration needs pH 7.00.`;
  }
  if (event.model.startsWith("colored_container_") && event.model !== REQUIRED_CONTAINER) {
    const color = event.model.replace("colored_container_", "");
    return `Wrong reagent (${color}). Check the order form.`;
  }
  return null;
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
  const verdict = evaluate(state.sample).verdict;
  return {
    ...state,
    completed: [...state.completed, "press_start"],
    status: "success",
    message: `Report ready: ${VERDICT_SHORT[verdict]}. The range is open.`,
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
      seed: state.seed,
      sample: state.sample,
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
  const wrong = wrongChoice(event);
  if (wrong) {
    return { ...s, status: "running", mistakes: s.mistakes + 1, message: wrong };
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
    flaskFilled: s.flaskFilled || step === "flask_to_bench",
    calibrated: s.calibrated || step === "select_container",
    message: upcoming ? `Next: ${title(upcoming)}.` : "",
  };
}
