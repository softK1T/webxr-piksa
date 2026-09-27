import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401
from tools.blender.extras import cone, fit_lods, join, material, ring, rod, set_origin  # noqa: E402,F401

NAME = "ph_meter"  # benchtop pH/conductivity meter + electrode stand on the right
LOD_SEGMENTS = (("LOD0", 24), ("LOD1", 14), ("LOD2", 8))
TILT = 0.3  # control panel slope, faces -Y (the user)
PANEL = (0, -0.02, 0.058)
ELECTRODE = (0.2, -0.012)  # x, y of the electrode; sample spot below it on the stand base


def on_panel(x, v, h):
    c, s = math.cos(TILT), math.sin(TILT)
    return (PANEL[0] + x, PANEL[1] + v * c - h * s, PANEL[2] + v * s + h * c)


def tilted(obj):
    obj.rotation_euler = (TILT, 0, 0)
    return obj


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    detail = s > 8
    housing = [
        cube(p + "Base", (0, 0, 0.025), (0.11, 0.09, 0.025), light, 0.008),
        tilted(cube(p + "Panel", PANEL, (0.105, 0.072, 0.012), dark)),
        cube(p + "Back", (0, 0.047, 0.06), (0.105, 0.006, 0.012), dark),
    ]
    if detail:
        for i, x in enumerate((-0.07, -0.035, 0.0)):
            housing.append(tilted(cube(p + f"Key{i}", on_panel(x, -0.052, 0.0135), (0.013, 0.008, 0.002), light)))
        for i, (x, y) in enumerate(((-0.09, -0.07), (0.09, -0.07), (-0.09, 0.07), (0.09, 0.07))):
            housing.append(cylinder(p + f"Foot{i}", (x, y, -0.002), 0.008, 0.004, dark, 8))
    join(housing, p + "Housing")
    tilted(cube(p + "Screen", on_panel(-0.025, 0.02, 0.0126), (0.065, 0.04, 0.0006), accent))
    tilted(cube(p + "MeasureKey", on_panel(0.07, -0.035, 0.0138), (0.022, 0.022, 0.0025), accent))

    ex, ey = ELECTRODE
    ss = max(s // 2, 6)
    stand = [
        cube(p + "StandBase", (0.2, 0.0, 0.006), (0.055, 0.07, 0.006), dark, 0.004),
        rod(p + "Rod", (0.2, 0.05, 0.012), (0.2, 0.05, 0.33), 0.005, light, ss),
        cube(p + "Clamp", (0.2, 0.05, 0.24), (0.01, 0.01, 0.012), dark),
        cube(p + "Arm", (0.2, 0.02, 0.24), (0.006, 0.036, 0.006), dark),
    ]
    if detail:
        stand.append(cylinder(p + "Knob", (0.213, 0.05, 0.24), 0.008, 0.01, dark, ss, (0, math.pi / 2, 0)))
    join(stand, p + "Stand")
    electrode = [
        cylinder(p + "Shaft", (ex, ey, 0.14), 0.006, 0.15, light, s),
        cylinder(p + "Head", (ex, ey, 0.2325), 0.0085, 0.035, dark, s),
        sphere(p + "Bulb", (ex, ey, 0.065), (0.0065, 0.0065, 0.0065), light, s),
    ]
    set_origin(join(electrode, p + "Electrode"), (ex, ey, 0.24))  # raise/lower along Z
    if detail:
        pts = ((ex, ey, 0.25), (0.18, 0.02, 0.3), (0.12, 0.08, 0.2), (0.08, 0.088, 0.04))
        join([rod(p + f"Cable{i}", pts[i], pts[i + 1], 0.0025, dark, 6) for i in range(3)], p + "Cable")


def generate():
    reset_scene()
    mats = palette((0.12, 0.45, 0.70))
    for level, seg in LOD_SEGMENTS:
        build(level + "_", seg, mats)
    fit_lods()
    finalize(NAME, lod=True)


if __name__ == "__main__":
    try:
        generate()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)
