import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "measurement_device"
COLOR = (0.2, 0.8, 0.55)
LOD = True
LOD_SEGMENTS = (("LOD0", 24), ("LOD1", 14), ("LOD2", 8))


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cube(p + "Body", (0, 0, 0.12), (0.18, 0.1, 0.12), dark, 0.015)
    cube(p + "Screen", (0, -0.1, 0.16), (0.12, 0.006, 0.055), accent, 0.004)
    for i in range(3):
        cylinder(p + f"Knob{i}", (-0.1 + i * 0.1, -0.11, 0.06), 0.02, 0.02, light, s, (math.pi / 2, 0, 0))
    for side in (-1, 1):
        cylinder(p + f"Foot{side}", (side * 0.14, 0, 0.005), 0.02, 0.01, light, s)
    cylinder(p + "Probe", (0.2, 0, 0.14), 0.008, 0.2, light, s)
    sphere(p + "ProbeTip", (0.2, 0, 0.24), (0.014, 0.014, 0.014), accent, s)

def generate():
    reset_scene()
    mats = palette(COLOR)
    if LOD:
        for level, seg in LOD_SEGMENTS:
            build(level + "_", seg, mats)
    else:
        build("", 12, mats)
    finalize(NAME, lod=LOD)


if __name__ == "__main__":
    try:
        generate()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)
