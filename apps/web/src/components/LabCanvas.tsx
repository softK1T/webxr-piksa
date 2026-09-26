import { Engine, PointerEventTypes, UniversalCamera } from "@babylonjs/core";
import { useEffect, useRef, useState } from "react";
import { BASE_CAMERA_SPEED, createLabScene } from "../scene/createLabScene";
import { LAB_LAYOUT } from "../scene/labLayout";
import { loadLabModels, type LoadProgress } from "../scene/loadLabModels";
import { GrabSystem } from "../sim/grab";
import { createHintMarker } from "../sim/hintMarker";
import { hintTarget } from "../sim/hints";
import { createInfoPanel } from "../sim/infoPanel";
import { createInteraction } from "../sim/interaction";
import {
  STEPS,
  initialScenario,
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
  setupXR,
  type XRController,
  type XREvents,
} from "../xr/setupXR";
import {
  XR_SUPPORT_TEXT,
  checkXRSupport,
  type XRSupport,
} from "../xr/xrSupport";

type Screen = "menu" | "instructions" | "settings" | "lab";

interface Runtime {
  engine: Engine;
  camera: UniversalCamera | null;
}

export default function LabCanvas() {
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
    runtimeRef.current = {
      engine,
      camera:
        scene.activeCamera instanceof UniversalCamera
          ? scene.activeCamera
          : null,
    };
    const panel = createInfoPanel(scene);
    let state = initialScenario;
    panel.draw(state);
    const dispatch = (event: ScenarioEvent) => {
      state = reduceScenario(state, event);
      panel.draw(state);
      if (!disposed) setScenario(state);
    };
    const grab = new GrabSystem(scene, dispatch);
    const interaction = createInteraction(scene, grab, dispatch);
    createHintMarker(scene, () => hintTarget(nextStep(state), grab.heldModel));
    const events: XREvents = {
      onStateChange: (value) => {
        if (!disposed) setInXR(value);
      },
      onSelect: (event) => {
        if (!disposed) setSelected(event);
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
    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
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
              / pick up / drop
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
