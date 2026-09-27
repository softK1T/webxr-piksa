import { Ray, Vector3, type WebXRInputSource } from "@babylonjs/core";
import { Engine, PointerEventTypes, UniversalCamera } from "@babylonjs/core";
import { useEffect, useRef, useState } from "react";
import { BASE_CAMERA_SPEED, createLabScene } from "../scene/createLabScene";
import { LAB_LAYOUT } from "../scene/labLayout";
import {
  LodManager,
  applyQuality,
  createLightZones,
  freezeStatic,
} from "../scene/quality";
import { loadLabModels, type LoadProgress } from "../scene/loadLabModels";
import { GrabSystem } from "../sim/grab";
import { createPourWatcher, cuvetteMouthOf, flaskMouthOf } from "../sim/pour";
import { clickEvent, openParcelLid } from "../sim/devices";
import { createHintMarker } from "../sim/hintMarker";
import { HINT_DELAY_MS, hintTarget } from "../sim/hints";
import { createStepBoard } from "../scene/stepBoard";
import { createEquipmentVisuals } from "../scene/equipmentVisuals";
import { createWristPanel } from "../sim/wristPanel";
import { createFoamSprayer, forwardOf } from "../sim/extinguisher";
import { createBlaster } from "../sim/blaster";
import { createShootingRange } from "../sim/range";
import { applyWarmLighting } from "../scene/lighting";
import { applyRoomTextures } from "../scene/textures";
import { applyLowPolyStyle } from "../scene/lowpoly";
import { createInteraction } from "../sim/interaction";
import {
  STEPS,
  initialScenario,
  newScenario,
  nextStep,
  reduceScenario,
  type ScenarioEvent,
  type ScenarioState,
} from "../sim/scenario";
import { SettingsForm } from "../ui/SettingsForm";
import {
  hardwareScaling,
  loadSettings,
  saveSettings,
  toXRSettings,
  type Settings,
} from "../ui/settings";
import type { SelectionEvent } from "../xr/selection";
import {
  emitSelection,
  onXRControllerAdded,
  onXRControllerRemoved,
  setupXR,
  type XRController,
  type XREvents,
} from "../xr/setupXR";
import {
  XR_SUPPORT_TEXT,
  checkXRSupport,
  type XRSupport,
} from "../xr/xrSupport";
import type { Scene } from "@babylonjs/core";

type Screen = "menu" | "instructions" | "settings" | "lab";

interface Runtime {
  engine: Engine;
  camera: UniversalCamera | null;
}

interface Props {
  onRegisterGetScene?: (fn: () => Scene | null) => void;
}

export default function LabCanvas({ onRegisterGetScene }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xrRef = useRef<XRController | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const settingsRef = useRef(settings);
  const startedAt = useRef<number | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [progress, setProgress] = useState<LoadProgress>({
    loaded: 0,
    total: LAB_LAYOUT.length,
    failed: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [support, setSupport] = useState<XRSupport | null>(null);
  const [xrReady, setXrReady] = useState(false);
  const [inXR, setInXR] = useState(false);
  const [selected, setSelected] = useState<SelectionEvent | null>(null);
  const [scenario, setScenario] = useState<ScenarioState>(initialScenario);
  const [finishedIn, setFinishedIn] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [blasterOn, setBlasterOn] = useState(false);
  const blasterRef = useRef<ReturnType<typeof createBlaster> | null>(null);
  const toggleBlaster = () =>
    setBlasterOn((on) => {
      blasterRef.current?.setEnabled(!on);
      return !on;
    });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "g" &&
        !(e.target instanceof HTMLInputElement)
      )
        toggleBlaster();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let engine: Engine;
    try {
      engine = new Engine(canvas, true, {
        stencil: true,
        preserveDrawingBuffer: false,
      });
    } catch {
      setError("WebGL is not available in this browser");
      return;
    }
    const scene = createLabScene(engine, canvas);

    // Register the scene getter so EditorPanel (mounted in App) can access it.
    onRegisterGetScene?.(() => engine.scenes[0] ?? null);

    applyQuality(scene, settingsRef.current.quality);
    scene.imageProcessingConfiguration.exposure =
      settingsRef.current.brightness;
    const lod = new LodManager(scene);
    runtimeRef.current = {
      engine,
      camera:
        scene.activeCamera instanceof UniversalCamera
          ? scene.activeCamera
          : null,
    };
    const board = createStepBoard(scene);
    const visuals = createEquipmentVisuals(scene);
    let state = newScenario();
    board.draw(state);
    const wrist = createWristPanel(scene);
    const range = createShootingRange(scene, {
      isUnlocked: () => state.status === "success",
      onToast: (message) => {
        if (!disposed) setToast(message);
      },
    });
    applyRoomTextures(scene);
    const lighting = applyWarmLighting(scene);
    const lightZones = createLightZones(scene);
    const lowpoly = applyLowPolyStyle(scene);
    const blaster = createBlaster(scene, {
      onRayHit: (mesh, point) => range.hit(mesh, point),
      onHit: (model, total) => {
        if (disposed) return;
        const what =
          model === "cuvette"
            ? "cuvette"
            : model === "sample_bottle"
              ? "sample bottle"
              : "flask";
        setToast(`Pew! Broke a ${what}. Total glassware lost: ${total}`);
      },
    });
    blasterRef.current = blaster;
    let rightSource: { inputSource: XRInputSource } | null = null;
    let bWasDown = false;
    const pollB = scene.onBeforeRenderObservable.add(() => {
      const pad = rightSource?.inputSource.gamepad;
      const down = !!pad?.buttons[5]?.pressed;
      if (down && !bWasDown) {
        console.info("[blaster] B pressed -> toggle");
        toggleBlaster();
      }
      bWasDown = down;
    });
    const onGun = onXRControllerAdded.add((source) => {
      xrSources.set(source.inputSource.handedness, source);
      if (source.inputSource.handedness !== "right") return;
      blaster.attachToController(source);
      rightSource = source;
    });
    wrist.draw(state);
    const onAdd = onXRControllerAdded.add((source) => {
      if (source.inputSource.handedness === "left")
        wrist.attach(source.grip ?? source.pointer);
    });
    const onRemove = onXRControllerRemoved.add((source) => {
      if (source.inputSource.handedness === "left") wrist.detach();
    });
    const dispatch = (event: ScenarioEvent) => {
      state = reduceScenario(state, event);
      board.draw(state);
      visuals.update(state);
      wrist.draw(state);
      if (!disposed) setScenario(state);
    };
    const pour = createPourWatcher(
      scene,
      () => (grab.heldModel === "sample_bottle" ? grab.heldAnchor : null),
      () => flaskMouthOf(scene),
      () =>
        dispatch({
          type: "poured",
          model: "sample_bottle",
          into: "erlenmeyer_flask",
        }),
    );
    const flaskPour = createPourWatcher(
      scene,
      () => (grab.heldModel === "erlenmeyer_flask" ? grab.heldAnchor : null),
      () => cuvetteMouthOf(scene),
      () =>
        dispatch({
          type: "poured",
          model: "erlenmeyer_flask",
          into: "cuvette",
        }),
    );
    const grab = new GrabSystem(scene, (event) => {
      dispatch(event);
      if (!("model" in event)) return;
      const watcher =
        event.model === "sample_bottle"
          ? pour
          : event.model === "erlenmeyer_flask"
            ? flaskPour
            : null;
      if (event.type === "grabbed") watcher?.start();
      else if (event.type === "placed") watcher?.stop();
    });
    const handleSelect = (event: {
      placementId: string | null;
      action: string;
    }) => {
      if (event.action === "squeeze") return;
      const e = clickEvent(event.placementId, grab.heldModel, state.leverOn);
      if (!e) return;
      if (e.type === "panel_opened") openParcelLid(scene);
      dispatch(e);
    };
    const foam = createFoamSprayer(scene);
    const xrSources = new Map<string, WebXRInputSource>();
    const holdsExtinguisher = () => grab.heldModel === "fire_extinguisher";
    const interaction = createInteraction(
      scene,
      grab,
      dispatch,
      (pressed, action) => {
        if (blasterRef.current?.enabled && action.hand === "right") {
          if (pressed) blasterRef.current.fireFromGun();
          return true;
        }
        if (!holdsExtinguisher() || grab.heldBy !== action.hand) return false;
        const anchor = grab.heldAnchor;
        const src = xrSources.get(action.hand);
        if (pressed && anchor && src) {
          const ray = new Ray(Vector3.Zero(), Vector3.Forward());
          foam.start(
            anchor,
            () => {
              src.getWorldPointerRayToRef(ray);
              return ray.direction.clone();
            },
            () => {
              src.getWorldPointerRayToRef(ray);
              return ray.origin.add(ray.direction.scale(0.08));
            },
          );
        } else if (pressed && anchor)
          foam.start(anchor, () => forwardOf(action.grip));
        else foam.stop();
        return true;
      },
    );
    const onSprayKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f" || e.repeat) return;
      const anchor = grab.heldAnchor;
      if (e.type === "keydown" && holdsExtinguisher() && anchor) {
        foam.start(anchor, () =>
          scene.activeCamera
            ? scene.activeCamera.getForwardRay().direction
            : new Vector3(0, 0, 1),
        );
      } else if (e.type === "keyup") foam.stop();
    };
    window.addEventListener("keydown", onSprayKey);
    window.addEventListener("keyup", onSprayKey);
    let hintStep: string | null = null;
    let hintSince = performance.now();
    let hintMistakes = 0;
    createHintMarker(scene, () => {
      const step = nextStep(state);
      if (step !== hintStep) {
        hintStep = step;
        hintSince = performance.now();
      }
      if (state.mistakes !== hintMistakes) {
        hintMistakes = state.mistakes;
        hintSince = -Infinity;
      }
      const stuck = performance.now() - hintSince > HINT_DELAY_MS;
      return step === "open_panel" || stuck
        ? hintTarget(step, grab.heldModel, state.cuvetteInserted)
        : null;
    });
    const events: XREvents = {
      onStateChange: (value) => {
        if (!disposed) setInXR(value);
      },
      onSelect: (event) => {
        if (!disposed) setSelected(event);
        if (!disposed) handleSelect(event);
      },
      onAction: (action) => interaction.controller(action),
    };
    scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERTAP || xrRef.current?.isInXR)
        return;
      const mesh = info.pickInfo?.hit
        ? (info.pickInfo.pickedMesh ?? null)
        : null;
      if (mesh) emitSelection(scene, mesh, "click", "mouse", events);
      if (scene.activeCamera) interaction.click(mesh, scene.activeCamera);
    });
    void loadLabModels(scene, (p) => {
      if (!disposed) setProgress(p);
    }).then(() => {
      if (disposed) return;
      visuals.update(state);
      freezeStatic(scene);
      applyQuality(scene, settingsRef.current.quality);
    });
    void checkXRSupport().then(async (result) => {
      if (disposed) return;
      setSupport(result);
      const floor = scene.getMeshByName("floor");
      if (result !== "supported" || !floor) return;
      try {
        const controller = await setupXR(
          scene,
          floor,
          events,
          toXRSettings(settingsRef.current),
        );
        if (disposed) return controller.dispose();
        xrRef.current = controller;
        setXrReady(true);
      } catch (e) {
        console.error("WebXR init failed", e);
        setSupport("unsupported");
      }
    });
    engine.runRenderLoop(() => {
      lod.update();
      scene.render();
    });
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      onXRControllerAdded.remove(onAdd);
      window.removeEventListener("keydown", onSprayKey);
      window.removeEventListener("keyup", onSprayKey);
      foam.dispose();
      pour.stop();
      flaskPour.stop();
      onXRControllerAdded.remove(onGun);
      scene.onBeforeRenderObservable.remove(pollB);
      blaster.dispose();
      range.dispose();
      lighting.dispose();
      lightZones.dispose();
      lowpoly.dispose();
      blasterRef.current = null;
      onXRControllerRemoved.remove(onRemove);
      disposed = true;
      window.removeEventListener("resize", onResize);
      xrRef.current?.dispose();
      xrRef.current = null;
      runtimeRef.current = null;
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
    const runtime = runtimeRef.current;
    if (runtime) {
      const activeScene = runtime.engine.scenes[0];
      if (activeScene) applyQuality(activeScene, settings.quality);
      if (activeScene)
        activeScene.imageProcessingConfiguration.exposure = settings.brightness;
      runtime.engine.setHardwareScalingLevel(
        hardwareScaling(settings.quality, window.devicePixelRatio),
      );
      if (runtime.camera)
        runtime.camera.speed = BASE_CAMERA_SPEED * settings.moveSpeed;
    }
    xrRef.current?.applySettings(toXRSettings(settings));
  }, [settings, xrReady]);

  useEffect(() => {
    if (
      scenario.status === "success" &&
      startedAt.current !== null &&
      finishedIn === null
    ) {
      setFinishedIn(Math.round((Date.now() - startedAt.current) / 1000));
    }
  }, [scenario.status, finishedIn]);

  const start = (vr: boolean) => {
    startedAt.current ??= Date.now();
    setScreen("lab");
    if (vr) enterVR();
  };
  const enterVR = () => {
    startedAt.current ??= Date.now();
    xrRef.current
      ?.enter()
      .catch((e: unknown) => setError(`Failed to enter VR: ${String(e)}`));
  };
  const exitVR = () => void xrRef.current?.exit();
  const restart = () => window.location.reload();

  const loading = progress.loaded < progress.total;
  const done = scenario.completed.length;
  const percent = Math.round((done / STEPS.length) * 100);
  const supportText = support
    ? XR_SUPPORT_TEXT[support]
    : "Checking VR support...";

  return (
    <div className="lab">
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        aria-label="Virtual laboratory"
      />
      <div className="toast-layer" role="status">
        {toast && <div className="toast">{toast}</div>}
      </div>

      {screen === "lab" && (
        <div className="xr-bar">
          <button onClick={() => setScreen("menu")}>Menu</button>
          {inXR ? (
            <button onClick={exitVR}>Exit VR</button>
          ) : (
            <button onClick={enterVR} disabled={!xrReady} title={supportText}>
              Enter VR
            </button>
          )}
          <button onClick={() => setScreen("settings")}>Settings</button>
          <button onClick={toggleBlaster} title="Toggle blaster (G)">
            {blasterOn ? "Holster" : "Blaster"}
          </button>
          <button onClick={restart} title="Reset the level to the start">
            Restart
          </button>
        </div>
      )}

      {screen === "lab" && (
        <div
          className={`task-card task-${scenario.status}`}
          data-testid="current-task"
        >
          {(() => {
            const id = nextStep(scenario);
            const index = STEPS.findIndex((st) => st.id === id);
            if (scenario.status === "success")
              return <strong>All tasks done</strong>;
            if (!id) return null;
            return (
              <>
                <span className="task-step">
                  Task {index + 1} / {STEPS.length}
                </span>
                <strong>{STEPS[index].title}</strong>
              </>
            );
          })()}
        </div>
      )}

      {screen === "lab" && (
        <div className="hud">
          {error ? (
            <p role="alert">{error}</p>
          ) : loading ? (
            <p>
              Loading models: {progress.loaded}/{progress.total}
            </p>
          ) : (
            <p>
              WASD / arrows: move, hold left mouse button: look, click: interact
              / pick up / drop, hold F with the extinguisher: spray foam
            </p>
          )}
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <p
            className={`scenario scenario-${scenario.status}`}
            data-testid="scenario"
          >
            Step {Math.min(done + 1, STEPS.length)}/{STEPS.length}:{" "}
            {scenario.message}
          </p>
          {selected && (
            <p>
              Selected: {selected.model ?? "-"} ({selected.action},{" "}
              {selected.hand})
            </p>
          )}
          {progress.failed.length > 0 && (
            <p role="alert">Failed to load: {progress.failed.join(", ")}</p>
          )}
        </div>
      )}

      {screen === "menu" && (
        <div className="overlay">
          <div className="card">
            <h2>Piksa VR Laboratory</h2>
            <p>
              Complete a short laboratory procedure in a virtual room, on
              desktop or in VR.
            </p>
            <button onClick={() => start(false)}>
              {startedAt.current ? "Resume (desktop)" : "Start (desktop)"}
            </button>
            <button onClick={() => start(true)} disabled={!xrReady}>
              Start in VR
            </button>
            <button onClick={() => setScreen("instructions")}>
              Instructions
            </button>
            <button onClick={() => setScreen("settings")}>Settings</button>
            <p className="muted">{supportText}</p>
            {loading && (
              <p className="muted">
                Loading models: {progress.loaded}/{progress.total}
              </p>
            )}
          </div>
        </div>
      )}

      {screen === "instructions" && (
        <div className="overlay">
          <div className="card">
            <h2>Instructions</h2>
            <ol>
              {STEPS.map((step) => (
                <li key={step.id}>{step.title}</li>
              ))}
            </ol>
            <h3>Desktop</h3>
            <p>
              WASD or arrows to move, hold the left mouse button to look around.
              Click to interact; click an item to pick it up and click again
              near the target zone to drop it.
            </p>
            <h3>VR</h3>
            <p>
              Teleport: push the stick forward and release. Trigger: interact.
              Hold squeeze to grab, release to drop. The yellow marker always
              points to the next target.
            </p>
            <button onClick={() => setScreen("menu")}>Back</button>
          </div>
        </div>
      )}

      {screen === "settings" && (
        <div className="overlay">
          <div className="card">
            <h2>Settings</h2>
            <SettingsForm settings={settings} onChange={setSettings} />
            <button
              onClick={() => setScreen(startedAt.current ? "lab" : "menu")}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {screen === "lab" && finishedIn !== null && !inXR && (
        <div className="overlay">
          <div className="card">
            <h2>Experiment completed</h2>
            <p>Time: {finishedIn} s</p>
            <p>Mistakes: {scenario.mistakes}</p>
            <button onClick={restart}>Restart</button>
            <button onClick={() => setScreen("menu")}>Main menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
