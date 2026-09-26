import { Engine, PointerEventTypes } from "@babylonjs/core";
import { useEffect, useRef, useState } from "react";
import { createLabScene } from "../scene/createLabScene";
import { LAB_LAYOUT } from "../scene/labLayout";
import { loadLabModels, type LoadProgress } from "../scene/loadLabModels";
import type { SelectionEvent } from "../xr/selection";
import {
  emitSelection,
  nextMode,
  setupXR,
  type LocomotionMode,
  type XRController,
} from "../xr/setupXR";
import {
  XR_SUPPORT_TEXT,
  checkXRSupport,
  type XRSupport,
} from "../xr/xrSupport";

export default function LabCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xrRef = useRef<XRController | null>(null);
  const [progress, setProgress] = useState<LoadProgress>({
    loaded: 0,
    total: LAB_LAYOUT.length,
    failed: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [support, setSupport] = useState<XRSupport | null>(null);
  const [xrReady, setXrReady] = useState(false);
  const [inXR, setInXR] = useState(false);
  const [mode, setMode] = useState<LocomotionMode>("teleport");
  const [selected, setSelected] = useState<SelectionEvent | null>(null);

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
    const events = {
      onStateChange: (value: boolean) => !disposed && setInXR(value),
      onSelect: (event: SelectionEvent) => !disposed && setSelected(event),
    };
    scene.onPointerObservable.add((info) => {
      if (
        info.type === PointerEventTypes.POINTERTAP &&
        info.pickInfo?.hit &&
        !xrRef.current?.isInXR
      ) {
        emitSelection(
          scene,
          info.pickInfo.pickedMesh,
          "click",
          "mouse",
          events,
        );
      }
    });
    void loadLabModels(scene, (p) => !disposed && setProgress(p));
    void checkXRSupport().then(async (result) => {
      if (disposed) return;
      setSupport(result);
      const floor = scene.getMeshByName("floor");
      if (result !== "supported" || !floor) return;
      try {
        const controller = await setupXR(scene, floor, events);
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
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  const toggleMode = () => {
    const value = nextMode(mode);
    xrRef.current?.setMode(value);
    setMode(value);
  };
  const enterVR = () =>
    xrRef.current
      ?.enter()
      .catch((e: unknown) => setError(`Failed to enter VR: ${String(e)}`));
  const exitVR = () => void xrRef.current?.exit();

  const loading = progress.loaded < progress.total;
  return (
    <div className="lab">
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        aria-label="Virtual laboratory"
      />
      <div className="xr-bar">
        {inXR ? (
          <button onClick={exitVR}>Exit VR</button>
        ) : (
          <button
            onClick={enterVR}
            disabled={!xrReady}
            title={support ? XR_SUPPORT_TEXT[support] : undefined}
          >
            Enter VR
          </button>
        )}
        <button onClick={toggleMode}>
          Movement: {mode === "teleport" ? "teleport" : "free"}
        </button>
        {support && <span>{XR_SUPPORT_TEXT[support]}</span>}
      </div>
      <div className="hud">
        {error ? (
          <p role="alert">{error}</p>
        ) : loading ? (
          <p>
            Loading models: {progress.loaded}/{progress.total}
          </p>
        ) : (
          <p>
            WASD / arrows: move, hold left mouse button: look, click: select
          </p>
        )}
        {selected && (
          <p>
            Selected: {selected.model ?? "—"} ({selected.action},{" "}
            {selected.hand})
          </p>
        )}
        {progress.failed.length > 0 && (
          <p role="alert">Failed to load: {progress.failed.join(", ")}</p>
        )}
      </div>
    </div>
  );
}
