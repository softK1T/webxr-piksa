import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "control_button"
COLOR = (0.9, 0.15, 0.1)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cube(p + "Base", (0, 0, 0.02), (0.08, 0.08, 0.02), dark, 0.008)
    cylinder(p + "Ring", (0, 0, 0.045), 0.06, 0.012, light, 16)
    cylinder(p + "Cap", (0, 0, 0.065), 0.05, 0.03, accent, 16)
    sphere(p + "Top", (0, 0, 0.08), (0.05, 0.05, 0.012), accent, 16)

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
