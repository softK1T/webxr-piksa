import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "warning_sign"
COLOR = (0.98, 0.78, 0.1)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cylinder(p + "Post", (0, 0, 0.3), 0.015, 0.6, dark, s)
    cylinder(p + "Plate", (0, 0, 0.7), 0.2, 0.02, accent, 3, (math.pi / 2, math.pi / 2, 0))
    cylinder(p + "Border", (0, 0.004, 0.7), 0.22, 0.012, dark, 3, (math.pi / 2, math.pi / 2, 0))
    cylinder(p + "Foot", (0, 0, 0.01), 0.12, 0.02, dark, s)

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
