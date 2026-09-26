import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "information_panel"
COLOR = (0.15, 0.45, 0.7)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cube(p + "Frame", (0, 0, 0.35), (0.4, 0.03, 0.25), dark, 0.012)
    cube(p + "Screen", (0, -0.032, 0.35), (0.36, 0.004, 0.21), accent)
    cube(p + "Stand", (0, 0.04, 0.05), (0.03, 0.02, 0.1), dark)
    cube(p + "Foot", (0, 0.04, 0.005), (0.15, 0.08, 0.005), dark)

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
