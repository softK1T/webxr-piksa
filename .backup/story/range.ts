import {
  ActionManager,
  Color3,
  Color4,
  DynamicTexture,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PointLight,
  StandardMaterial,
  Texture,
  Vector3,
  type AbstractMesh,
  type Scene,
} from "@babylonjs/core";
import { createBevelBox } from "../scene/bevelBox";

/** Shooting range behind the west wall of the lab. */
export const RANGE = {
  x0: -15,
  x1: -5,
  z0: 1.2,
  z1: 3.8,
  height: 3,
  door: { z: 2.5, width: 1.0, height: 2.2 },
  button: [-2.75, 0.8, 0.585] as const,
} as const;

export const TARGET_RADIUS = 0.25;

/** Ring score 10..1 from the distance to the target centre, 0 if outside. */
export function ringScore(distance: number, radius = TARGET_RADIUS): number {
  if (distance > radius) return 0;
  return Math.max(1, 10 - Math.floor((distance / radius) * 10));
}

function mat(scene: Scene, name: string, color: Color3, emissive?: Color3) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = color;
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  if (emissive) m.emissiveColor = emissive;
  return m;
}

function solid(
  scene: Scene,
  name: string,
  size: [number, number, number],
  pos: [number, number, number],
  material: StandardMaterial,
) {
  const m = createBevelBox(
    name,
    { width: size[0], height: size[1], depth: size[2] },
    scene,
  );
  m.position.set(...pos);
  m.material = material;
  m.checkCollisions = true;
  return m;
}

function targetTexture(scene: Scene) {
  const s = 512;
  const tex = new DynamicTexture(
    "range_target_tex",
    { width: s, height: s },
    scene,
    true,
  );
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D | null;
  if (ctx) {
    ctx.fillStyle = "#efe8d8";
    ctx.fillRect(0, 0, s, s);
    for (let r = 10; r >= 1; r--) {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, (r / 10) * (s / 2 - 6), 0, Math.PI * 2);
      ctx.fillStyle = r <= 2 ? "#c0282d" : r <= 6 ? "#1b1b1b" : "#efe8d8";
      ctx.fill();
      ctx.strokeStyle = r <= 6 ? "#efe8d8" : "#1b1b1b";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    tex.update();
  }
  return tex;
}

/** Replace the solid west wall of the lab with segments around a door opening. */
function cutWestWall(scene: Scene, wallMat: StandardMaterial) {
  const wall = scene.meshes.find((m) => {
    if (m.name.startsWith("range_")) return false;
    const b = m.getBoundingInfo().boundingBox;
    return (
      b.maximumWorld.x - b.minimumWorld.x < 0.4 &&
      b.minimumWorld.x < -4.85 &&
      b.maximumWorld.z - b.minimumWorld.z > 6
    );
  });
  if (!wall) {
    console.warn("[range] west wall not found, door opening not cut");
    return;
  }
  const b = wall.getBoundingInfo().boundingBox;
  const t = b.maximumWorld.x - b.minimumWorld.x;
  const x = (b.maximumWorld.x + b.minimumWorld.x) / 2;
  const zMin = b.minimumWorld.z;
  const zMax = b.maximumWorld.z;
  const h = b.maximumWorld.y - b.minimumWorld.y;
  const yMin = b.minimumWorld.y;
  const d0 = RANGE.door.z - RANGE.door.width / 2;
  const d1 = RANGE.door.z + RANGE.door.width / 2;
  const material = (wall.material as StandardMaterial | null) ?? wallMat;
  wall.dispose();
  const seg = (
    name: string,
    z0: number,
    z1: number,
    y0: number,
    y1: number,
  ) => {
    const m = solid(
      scene,
      name,
      [t, y1 - y0, z1 - z0],
      [x, (y0 + y1) / 2, (z0 + z1) / 2],
      material,
    );
    m.metadata = { dynamic: true };
  };
  seg("range_wall_s", zMin, d0, yMin, yMin + h);
  seg("range_wall_n", d1, zMax, yMin, yMin + h);
  seg("range_wall_lintel", d0, d1, RANGE.door.height, yMin + h);
}

function shards(scene: Scene, at: Vector3, color: Color4) {
  const ps = new ParticleSystem("range_shards", 200, scene);
  ps.particleTexture = new Texture(
    "data:image/svg+xml;base64," +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect x="3" y="3" width="10" height="10" fill="white"/></svg>',
      ),
    scene,
  );
  ps.emitter = at.clone();
  ps.createSphereEmitter(0.04);
  ps.minEmitPower = 1.2;
  ps.maxEmitPower = 3;
  ps.gravity = new Vector3(0, -9.8, 0);
  ps.minSize = 0.006;
  ps.maxSize = 0.02;
  ps.minLifeTime = 0.5;
  ps.maxLifeTime = 1.2;
  ps.manualEmitCount = 150;
  ps.color1 = color;
  ps.color2 = color;
  ps.colorDead = new Color4(color.r, color.g, color.b, 0);
  ps.targetStopDuration = 1.3;
  ps.disposeOnStop = true;
  ps.start();
}

export interface RangeEvents {
  onToast(message: string): void;
}

export function createShootingRange(scene: Scene, events: RangeEvents) {
  const { x0, x1, z0, z1, height: H } = RANGE;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const concrete = mat(scene, "M_RangeConcrete", new Color3(0.32, 0.33, 0.35));
  const wall = mat(scene, "M_RangeWall", new Color3(0.22, 0.24, 0.27));
  const rubber = mat(scene, "M_RangeBackstop", new Color3(0.07, 0.07, 0.08));
  const wood = mat(scene, "M_RangeWood", new Color3(0.45, 0.32, 0.2));
  const steel = mat(scene, "M_RangeSteel", new Color3(0.4, 0.42, 0.45));
  const yellow = mat(
    scene,
    "M_RangeLine",
    new Color3(0.95, 0.75, 0.1),
    new Color3(0.3, 0.22, 0),
  );
  const doorMat = mat(scene, "M_RangeDoor", new Color3(0.55, 0.12, 0.1));
  const t = 0.1;

  cutWestWall(scene, wall);

  const floor = MeshBuilder.CreateGround(
    "range_floor",
    { width: x1 - x0, height: z1 - z0 },
    scene,
  );
  floor.position.set(cx, 0.001, cz);
  floor.material = concrete;
  floor.checkCollisions = true;
  solid(
    scene,
    "range_ceiling",
    [x1 - x0, t, z1 - z0],
    [cx, H + t / 2, cz],
    wall,
  ).isPickable = false;
  solid(
    scene,
    "range_wall_north",
    [x1 - x0, H, t],
    [cx, H / 2, z1 + t / 2],
    wall,
  );
  solid(
    scene,
    "range_wall_south",
    [x1 - x0, H, t],
    [cx, H / 2, z0 - t / 2],
    wall,
  );
  solid(
    scene,
    "range_backstop",
    [0.3, H, z1 - z0],
    [x0 + 0.15, H / 2, cz],
    rubber,
  );
  // angled baffle over the backstop
  const baffle = solid(
    scene,
    "range_baffle",
    [1.2, 0.05, z1 - z0],
    [x0 + 0.8, H - 0.4, cz],
    rubber,
  );
  baffle.rotation.z = -0.5;

  // shooting booth: counter, lane dividers, firing line
  const counterX = -6.2;
  solid(
    scene,
    "range_counter",
    [0.45, 0.06, z1 - z0],
    [counterX, 1.02, cz],
    wood,
  );
  solid(
    scene,
    "range_counter_front",
    [0.04, 1.0, z1 - z0],
    [counterX - 0.2, 0.5, cz],
    wood,
  );
  for (const z of [z0 + (z1 - z0) / 3, z0 + (2 * (z1 - z0)) / 3]) {
    solid(
      scene,
      "range_divider",
      [0.9, 1.4, 0.03],
      [counterX + 0.2, 1.3, z],
      steel,
    );
  }
  const line = MeshBuilder.CreateGround(
    "range_line",
    { width: 0.08, height: z1 - z0 },
    scene,
  );
  line.position.set(counterX + 0.45, 0.004, cz);
  line.material = yellow;
  line.isPickable = false;

  // lights
  [-7, -10.5, -14].forEach((x, i) => {
    const l = new PointLight(
      `range_light_${i}`,
      new Vector3(x, H - 0.2, cz),
      scene,
    );
    l.intensity = i === 2 ? 0.9 : 0.5;
    l.range = 7;
    const lamp = createBevelBox(
      "range_lamp",
      { width: 1.0, height: 0.03, depth: 0.25 },
      scene,
    );
    lamp.position.set(x, H - 0.015, cz);
    lamp.material = mat(
      scene,
      `M_RangeLamp${i}`,
      Color3.White(),
      new Color3(1, 0.96, 0.88),
    );
    lamp.isPickable = false;
  });

  // paper targets on stands, three lanes at 5 / 7 / 9 m
  const targetMat = new StandardMaterial("M_RangeTarget", scene);
  targetMat.diffuseTexture = targetTexture(scene);
  targetMat.emissiveColor = new Color3(0.25, 0.25, 0.25);
  targetMat.backFaceCulling = false;
  const holeMat = mat(scene, "M_RangeHole", new Color3(0.04, 0.04, 0.04));
  const lanes = [z0 + (z1 - z0) / 6, cz, z1 - (z1 - z0) / 6];
  const targets = lanes.map((z, i) => {
    const x = counterX - 5 - i * 2;
    solid(
      scene,
      "range_stand",
      [0.04, 1.35, 0.04],
      [x - 0.02, 0.675, z],
      steel,
    );
    const board = MeshBuilder.CreatePlane(
      `range_target_${i}`,
      { size: TARGET_RADIUS * 2 + 0.04, sideOrientation: Mesh.DOUBLESIDE },
      scene,
    );
    board.position.set(x, 1.45, z);
    board.rotation.y = -Math.PI / 2;
    board.material = targetMat;
    board.metadata = { rangeTarget: i, dynamic: true };
    return board;
  });

  // glass bottles on a bench at 4 m
  const glass = new StandardMaterial("M_RangeGlass", scene);
  glass.diffuseColor = new Color3(0.4, 0.75, 0.5);
  glass.alpha = 0.55;
  glass.specularColor = new Color3(1, 1, 1);
  glass.specularPower = 128;
  const benchX = counterX - 3.5;
  solid(scene, "range_bench", [0.35, 0.05, 1.8], [benchX, 0.85, cz], wood);
  solid(
    scene,
    "range_bench_leg",
    [0.3, 0.85, 0.05],
    [benchX, 0.425, cz - 0.8],
    wood,
  );
  solid(
    scene,
    "range_bench_leg",
    [0.3, 0.85, 0.05],
    [benchX, 0.425, cz + 0.8],
    wood,
  );
  const bottles = [-0.7, -0.35, 0, 0.35, 0.7].map((dz, i) => {
    const b = MeshBuilder.CreateCylinder(
      `range_bottle_${i}`,
      {
        diameterTop: 0.03,
        diameterBottom: 0.075,
        height: 0.24,
        tessellation: 16,
      },
      scene,
    );
    b.position.set(benchX, 0.875 + 0.12, cz + dz);
    b.material = glass;
    b.metadata = { rangeBottle: i, dynamic: true };
    return b;
  });

  // sliding door in the lab's west wall
  const doorClosedZ = RANGE.door.z;
  const doorOpenZ = RANGE.door.z - RANGE.door.width + 0.02;
  const door = createBevelBox(
    "range_door",
    { width: 0.06, height: RANGE.door.height, depth: RANGE.door.width },
    scene,
  );
  door.position.set(-5, RANGE.door.height / 2, doorClosedZ);
  door.material = doorMat;
  door.checkCollisions = true;
  door.metadata = { dynamic: true };
  const sign = MeshBuilder.CreatePlane(
    "range_sign",
    { width: 0.9, height: 0.22, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  const signTex = new DynamicTexture(
    "range_sign_tex",
    { width: 512, height: 128 },
    scene,
    true,
  );
  const sctx =
    signTex.getContext() as unknown as CanvasRenderingContext2D | null;
  if (sctx) {
    sctx.fillStyle = "#1a1a1a";
    sctx.fillRect(0, 0, 512, 128);
    sctx.fillStyle = "#ffcc33";
    sctx.font = "bold 64px sans-serif";
    sctx.textAlign = "center";
    // shrink the font until the text fits the sign with a margin
    {
      const maxW = 512 - 48;
      let px = parseInt(/(\d+)px/.exec(sctx.font)?.[1] ?? "64", 10);
      while (sctx.measureText("SHOOTING RANGE").width > maxW && px > 12) {
        px -= 2;
        sctx.font = sctx.font.replace(/\d+px/, `${px}px`);
      }
    }
    sctx.fillText("SHOOTING RANGE", 256, 86);
    signTex.update();
  }
  const signMat = new StandardMaterial("M_RangeSign", scene);
  signMat.diffuseTexture = signTex;
  signMat.emissiveColor = new Color3(0.6, 0.6, 0.6);
  sign.material = signMat;
  sign.position.set(-4.93, RANGE.door.height + 0.25, RANGE.door.z);
  sign.rotation.y = -Math.PI / 2;
  sign.isPickable = false;

  let doorOpen = false;
  let doorZ = doorClosedZ;
  const slide = scene.onBeforeRenderObservable.add(() => {
    const target = doorOpen ? doorOpenZ : doorClosedZ;
    if (Math.abs(target - doorZ) < 1e-4) return;
    const step = (scene.getEngine().getDeltaTime() / 1000) * 1.2;
    doorZ +=
      Math.sign(target - doorZ) * Math.min(step, Math.abs(target - doorZ));
    door.position.z = doorZ;
  });

  // hidden button under the front edge of the sample bench
  const plate = createBevelBox(
    "range_button_plate",
    { width: 0.09, height: 0.06, depth: 0.012 },
    scene,
  );
  plate.position.set(RANGE.button[0], RANGE.button[1], RANGE.button[2] + 0.004);
  plate.material = steel;
  const button = MeshBuilder.CreateCylinder(
    "range_button",
    { diameter: 0.035, height: 0.018, tessellation: 20 },
    scene,
  );
  button.rotation.x = Math.PI / 2;
  button.position.set(
    RANGE.button[0],
    RANGE.button[1],
    RANGE.button[2] - 0.006,
  );
  button.material = mat(
    scene,
    "M_RangeButton",
    new Color3(0.8, 0.1, 0.08),
    new Color3(0.35, 0.02, 0.02),
  );
  button.metadata = { dynamic: true };
  const press = () => {
    doorOpen = !doorOpen;
    button.position.z = RANGE.button[2] - 0.001;
    window.setTimeout(() => (button.position.z = RANGE.button[2] - 0.006), 150);
    events.onToast(
      doorOpen
        ? "Click. Something opened behind the safety shelf..."
        : "The range door closes.",
    );
  };
  button.actionManager = new ActionManager(scene);
  button.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPickTrigger, press),
  );

  let score = 0;
  let shots = 0;
  const hit = (mesh: AbstractMesh, point: Vector3): boolean => {
    const meta = mesh.metadata as {
      rangeTarget?: number;
      rangeBottle?: number;
    } | null;
    if (meta?.rangeTarget !== undefined) {
      const board = targets[meta.rangeTarget];
      const d = Math.hypot(
        point.y - board.position.y,
        point.z - board.position.z,
      );
      const pts = ringScore(d);
      shots += 1;
      score += pts;
      const hole = MeshBuilder.CreateDisc(
        "range_hole",
        { radius: 0.007, tessellation: 10 },
        scene,
      );
      hole.material = holeMat;
      hole.isPickable = false;
      hole.position.set(point.x + 0.003, point.y, point.z);
      hole.rotation.y = -Math.PI / 2;
      events.onToast(
        `${pts === 10 ? "Bullseye! " : ""}${pts} pts • total ${score} in ${shots} shots`,
      );
      return true;
    }
    if (meta?.rangeBottle !== undefined) {
      const b = bottles[meta.rangeBottle];
      if (!b.isEnabled()) return true;
      b.setEnabled(false);
      shards(scene, point, new Color4(0.5, 0.9, 0.6, 0.9));
      window.setTimeout(() => b.setEnabled(true), 4000);
      events.onToast("Bottle down!");
      return true;
    }
    return false;
  };

  return {
    hit,
    press,
    get doorOpen() {
      return doorOpen;
    },
    dispose() {
      scene.onBeforeRenderObservable.remove(slide);
    },
  };
}
