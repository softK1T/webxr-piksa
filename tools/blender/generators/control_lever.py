import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "control_lever"
COLOR = (0.95, 0.75, 0.15)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cube(p + "Base", (0, 0, 0.02), (0.09, 0.06, 0.02), dark, 0.008)
    cylinder(p + "Pivot", (0, 0, 0.05), 0.03, 0.1, light, s, (0, math.pi / 2, 0))
    cylinder(p + "Shaft", (0, 0, 0.16), 0.013, 0.22, light, s)
    sphere(p + "Grip", (0, 0, 0.28), (0.035, 0.035, 0.04), accent, s)

def generate():
    reset_scene()
    mats = palette(COLOR)
    if LOD:
        for level, seg in LODS:
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
