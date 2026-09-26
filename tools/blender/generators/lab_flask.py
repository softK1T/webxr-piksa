import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "lab_flask"
COLOR = (0.95, 0.52, 0.1)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    sphere(p + "Body", (0, 0, 0.1), (0.1, 0.1, 0.1), light, s)
    cylinder(p + "Neck", (0, 0, 0.26), 0.03, 0.14, light, s)
    torus(p + "Rim", (0, 0, 0.33), 0.034, 0.008, light, s)
    sphere(p + "Liquid", (0, 0, 0.07), (0.085, 0.085, 0.06), accent, s)

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
