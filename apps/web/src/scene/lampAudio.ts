import { Vector3, type Scene } from "@babylonjs/core";

/** Mains frequency in the USSR: 50 Hz, tubes hum at 100 Hz plus harmonics. */
export const HUM_HZ = 100;
export const MASTER_VOLUME = 0.35;

interface Voice {
  gain: GainNode;
  panner: PannerNode;
}

const noop = {
  level: () => {},
  click: () => {},
  dispose: () => {},
  get muted() {
    return true;
  },
};

/**
 * Procedural 3D hum for every ceiling fixture (no audio files):
 * 100/200/300 Hz ballast hum + filtered buzz, positioned at the lamp,
 * plus starter "tick" clicks when a faulty tube blinks. Press M to mute.
 */
export function createLampAudio(
  scene: Scene,
  positions: [number, number, number][],
) {
  const Ctx = (globalThis as { AudioContext?: typeof AudioContext })
    .AudioContext;
  if (!Ctx) return noop;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(ctx.destination);
  let muted = false;

  // shared 2 s white-noise buffer
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const voices: Voice[] = positions.map(([x, y, z], idx) => {
    const panner = new PannerNode(ctx, {
      panningModel: "HRTF",
      distanceModel: "inverse",
      refDistance: 1,
      maxDistance: 20,
      rolloffFactor: 1.4,
      positionX: x,
      positionY: y,
      positionZ: z,
    });
    panner.connect(master);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(panner);
    const detune = (idx % 3) * 0.4; // tubes are never perfectly in tune
    [
      { f: HUM_HZ, type: "sawtooth" as OscillatorType, v: 0.05 },
      { f: HUM_HZ * 2, type: "sine" as OscillatorType, v: 0.04 },
      { f: HUM_HZ * 3, type: "sine" as OscillatorType, v: 0.02 },
    ].forEach(({ f, type, v }) => {
      const o = new OscillatorNode(ctx, { frequency: f + detune, type });
      const g = new GainNode(ctx, { gain: v });
      o.connect(g).connect(gain);
      o.start();
    });
    const buzz = new AudioBufferSourceNode(ctx, {
      buffer: noise,
      loop: true,
      loopStart: Math.random(),
    });
    const band = new BiquadFilterNode(ctx, {
      type: "bandpass",
      frequency: 2400 + idx * 150,
      Q: 6,
    });
    const bg = new GainNode(ctx, { gain: 0.012 });
    buzz.connect(band).connect(bg).connect(gain);
    buzz.start();
    return { gain, panner };
  });

  // listener follows the active camera (desktop or XR)
  const L = ctx.listener;
  const fwd = new Vector3();
  const up = new Vector3();
  const follow = scene.onBeforeRenderObservable.add(() => {
    const cam = scene.activeCamera;
    if (!cam) return;
    const p = cam.globalPosition;
    cam.getDirectionToRef(Vector3.Forward(scene.useRightHandedSystem), fwd);
    cam.getDirectionToRef(Vector3.Up(), up);
    const t = ctx.currentTime;
    if (L.positionX) {
      L.positionX.setValueAtTime(p.x, t);
      L.positionY.setValueAtTime(p.y, t);
      L.positionZ.setValueAtTime(p.z, t);
      L.forwardX.setValueAtTime(fwd.x, t);
      L.forwardY.setValueAtTime(fwd.y, t);
      L.forwardZ.setValueAtTime(-fwd.z, t);
      L.upX.setValueAtTime(up.x, t);
      L.upY.setValueAtTime(up.y, t);
      L.upZ.setValueAtTime(-up.z, t);
    }
  });

  // browsers only start audio after a user gesture
  const resume = () => void ctx.resume();
  const onKey = (e: KeyboardEvent) => {
    resume();
    if (e.key.toLowerCase() === "m" && !e.repeat) {
      muted = !muted;
      master.gain.setTargetAtTime(
        muted ? 0 : MASTER_VOLUME,
        ctx.currentTime,
        0.05,
      );
    }
  };
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", onKey);

  return {
    get muted() {
      return muted;
    },
    /** Lamp brightness 0..~1.05 drives the hum level. */
    level(idx: number, k: number) {
      const v = voices[idx];
      if (v)
        v.gain.gain.setTargetAtTime(k < 0.2 ? 0 : k, ctx.currentTime, 0.015);
    },
    /** Starter tick + arc crackle when a tube blinks. */
    click(idx: number) {
      const v = voices[idx];
      if (!v || ctx.state !== "running") return;
      const t = ctx.currentTime;
      const src = new AudioBufferSourceNode(ctx, {
        buffer: noise,
        loopStart: Math.random(),
      });
      const hp = new BiquadFilterNode(ctx, {
        type: "highpass",
        frequency: 1800,
      });
      const g = new GainNode(ctx, { gain: 0 });
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        t + 0.04 + Math.random() * 0.05,
      );
      src.connect(hp).connect(g).connect(v.panner);
      src.start(t, Math.random(), 0.1);
      const tick = new OscillatorNode(ctx, {
        frequency: 3200 + Math.random() * 800,
        type: "square",
      });
      const tg = new GainNode(ctx, { gain: 0.08 });
      tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
      tick.connect(tg).connect(v.panner);
      tick.start(t);
      tick.stop(t + 0.015);
    },
    dispose() {
      scene.onBeforeRenderObservable.remove(follow);
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", onKey);
      void ctx.close();
    },
  };
}
