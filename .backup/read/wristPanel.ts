import {
  DynamicTexture,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  type Scene,
  type TransformNode,
} from "@babylonjs/core";
import { STEPS, nextStep, type ScenarioState } from "./scenario";

const W = 512;
const H = 224;

export function taskText(state: ScenarioState): { head: string; body: string } {
  if (state.status === "success")
    return { head: "DONE", body: "All tasks done" };
  const id = nextStep(state);
  const index = STEPS.findIndex((s) => s.id === id);
  if (index < 0) return { head: "", body: state.message };
  return {
    head: `TASK ${index + 1} / ${STEPS.length}`,
    body: STEPS[index].title,
  };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function createWristPanel(scene: Scene) {
  const plane = MeshBuilder.CreatePlane(
    "wrist_task_panel",
    { width: 0.16, height: 0.07, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  plane.isPickable = false;
  plane.metadata = { dynamic: true };
  plane.alwaysSelectAsActiveMesh = true;
  plane.renderingGroupId = 1;
  plane.setEnabled(false);
  const texture = new DynamicTexture(
    "wrist_task_tex",
    { width: W, height: H },
    scene,
    true,
  );
  const mat = new StandardMaterial("M_WristTask", scene);
  mat.diffuseTexture = texture;
  mat.emissiveTexture = texture;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  plane.material = mat;

  const draw = (state: ScenarioState) => {
    const ctx =
      texture.getContext() as unknown as CanvasRenderingContext2D | null;
    if (!ctx) return;
    const { head, body } = taskText(state);
    const accent =
      state.status === "success"
        ? "#7dffa0"
        : state.status === "failed"
          ? "#ff8a7a"
          : "#ffd166";
    ctx.fillStyle = "#12181f";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 12, H);
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(head, 32, 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    wrap(ctx, body, W - 56).forEach((l, i) => ctx.fillText(l, 32, 96 + i * 44));
    texture.update();
  };

  const attach = (grip: TransformNode) => {
    plane.parent = grip;
    plane.position.set(0, 0.07, 0.03);
    plane.rotation.set(Math.PI / 4, 0, 0);
    plane.unfreezeWorldMatrix();
    plane.setEnabled(true);
  };
  const detach = () => {
    plane.parent = null;
    plane.setEnabled(false);
  };

  return { mesh: plane, draw, attach, detach };
}
