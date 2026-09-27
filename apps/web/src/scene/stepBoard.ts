import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial,
  type Scene,
} from "@babylonjs/core";
import {
  STEPS,
  nextStep,
  reportLines,
  type ScenarioState,
} from "../sim/scenario";
import { STEP_GUIDE, wrapText } from "../sim/stepGuide";

const W = 1536;
const H = 600;
export const GUIDE_CHARS = 66;
export const GUIDE_LINES = 4;

/** Chalkboard on the back wall (buildRoom.ts: 2.5 x 1 m at -0.6, 2.05, 3.92). */
export const BOARD = {
  center: [-0.6, 2.05, 3.89] as const,
  width: 2.4,
  height: 0.94,
};

/** Detailed instructions for all 8 steps; redrawn on state change only. */
export function createStepBoard(scene: Scene) {
  const plane = MeshBuilder.CreatePlane(
    "step_board",
    { width: BOARD.width, height: BOARD.height },
    scene,
  );
  plane.position.set(...BOARD.center);
  plane.isPickable = false;
  const texture = new DynamicTexture(
    "step_board_texture",
    { width: W, height: H },
    scene,
    true,
  );
  const material = new StandardMaterial("M_StepBoard", scene);
  material.diffuseTexture = texture;
  material.emissiveColor = Color3.White();
  material.specularColor = Color3.Black();
  material.disableLighting = true;
  plane.material = material;

  const draw = (state: ScenarioState) => {
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = "#1f2b25";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f1eee2";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(
      state.status === "success"
        ? "Test report"
        : "Well water analysis - what to do",
      32,
      48,
    );
    ctx.font = "22px sans-serif";
    ctx.fillStyle = state.status === "failed" ? "#ff8a7a" : "#ffd166";
    ctx.fillText(
      state.status === "failed" || state.status === "success"
        ? state.message
        : "Request: water turned cloudy after rain. Is it safe to drink?",
      W / 2,
      48,
    );
    if (state.status === "success") {
      ctx.fillStyle = "#f1eee2";
      ctx.font = "28px sans-serif";
      reportLines(state)
        .slice(0, 10)
        .forEach((line, i) => ctx.fillText(line, 32, 110 + i * 44));
      texture.update();
      return;
    }
    const current = nextStep(state);
    STEPS.forEach((step, i) => {
      const x = 32 + (i < 4 ? 0 : W / 2);
      let y = 100 + (i % 4) * 124;
      const done = state.completed.includes(step.id);
      const now = step.id === current;
      ctx.fillStyle = done ? "#8fa596" : now ? "#ffd166" : "#f1eee2";
      ctx.font = "bold 25px sans-serif";
      ctx.fillText(
        `${done ? "[x]" : now ? ">>" : "[ ]"} ${i + 1}. ${step.title}`,
        x,
        y,
      );
      ctx.font = "20px sans-serif";
      for (const line of wrapText(STEP_GUIDE[step.id], GUIDE_CHARS).slice(
        0,
        GUIDE_LINES,
      )) {
        y += 24;
        ctx.fillText(line, x + 12, y);
      }
    });
    texture.update();
  };

  return { mesh: plane, draw };
}
