import {
  SPEED_MAX,
  SPEED_MIN,
  type Quality,
  type Settings,
  type TurnType,
  BRIGHTNESS_MIN,
  BRIGHTNESS_MAX,
} from "./settings";
import type { LocomotionMode } from "../xr/setupXR";

interface Props {
  settings: Settings;
  onChange(settings: Settings): void;
}

export function SettingsForm({ settings, onChange }: Props) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });
  return (
    <form className="settings" onSubmit={(e) => e.preventDefault()}>
      <label>
        Brightness: {Math.round(settings.brightness * 100)}%
        <input
          type="range"
          min={BRIGHTNESS_MIN}
          max={BRIGHTNESS_MAX}
          step={0.05}
          value={settings.brightness}
          aria-label="Brightness"
          onChange={(e) => set("brightness", Number(e.target.value))}
        />
      </label>
      <label>
        Movement speed: {settings.moveSpeed.toFixed(1)}x
        <input
          type="range"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={0.1}
          value={settings.moveSpeed}
          onChange={(e) => set("moveSpeed", Number(e.target.value))}
        />
      </label>
      <label>
        VR locomotion
        <select
          value={settings.locomotion}
          onChange={(e) => set("locomotion", e.target.value as LocomotionMode)}
        >
          <option value="teleport">Teleport</option>
          <option value="free">Free movement</option>
        </select>
      </label>
      <label>
        VR turning
        <select
          value={settings.turn}
          onChange={(e) => set("turn", e.target.value as TurnType)}
        >
          <option value="snap">Snap</option>
          <option value="smooth">Smooth</option>
        </select>
      </label>
      <label>
        Graphics quality
        <select
          value={settings.quality}
          onChange={(e) => set("quality", e.target.value as Quality)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
    </form>
  );
}
