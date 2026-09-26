import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "test_tube"
COLOR = (0.2, 0.65, 0.85)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cylinder(p + "Tube", (0, 0, 0.1), 0.017, 0.16, light, s)
    sphere(p + "Bottom", (0, 0, 0.02), (0.017, 0.017, 0.02), light, s)
    cylinder(p + "Liquid", (0, 0, 0.055), 0.0175, 0.06, accent, s)
    torus(p + "Lip", (0, 0, 0.18), 0.018, 0.004, light, s)

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
