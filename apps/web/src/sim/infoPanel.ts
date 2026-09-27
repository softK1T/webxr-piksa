import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
} from "@babylonjs/core";
import { STEPS, type ScenarioState } from "./scenario";

const W = 1024;
const H = 600;

export function createInfoPanel(scene: Scene) {
  const plane = MeshBuilder.CreatePlane(
    "info_screen",
    { width: 1.4, height: 0.82, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  plane.position.set(0, 0.7, 3.5);
  plane.metadata = { placementId: "info_panel", model: "information_panel" };
  const texture = new DynamicTexture(
    "info_texture",
    { width: W, height: H },
    scene,
    false,
  );
  const material = new StandardMaterial("M_InfoScreen", scene);
  material.diffuseTexture = texture;
  material.emissiveColor = Color3.White();
  material.disableLighting = true;
  plane.material = material;

  const draw = (state: ScenarioState) => {
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = "#12304a";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("Order form", 40, 70);
    if (state.status === "idle") {
      ctx.font = "34px sans-serif";
      ctx.fillText("Click or pull the trigger to open.", 40, 160);
    } else {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(
        `Sample No. ${state.sampleNo}  -  analysis in neutral buffer`,
        40,
        120,
      );
      ctx.font = "28px sans-serif";
      STEPS.forEach((step, i) => {
        const done = state.completed.includes(step.id);
        ctx.fillStyle = done ? "#7dffa0" : "#ffffff";
        ctx.fillText(
          `${done ? "[x]" : "[ ]"} ${i + 1}. ${step.title}`,
          40,
          170 + i * 42,
        );
      });
    }
    const colors: Record<string, string> = {
      success: "#7dffa0",
      failed: "#ff8a7a",
    };
    ctx.fillStyle = colors[state.status] ?? "#ffd166";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(state.message, 40, H - 40);
    texture.update();
  };

  return { mesh: plane, draw };
}
