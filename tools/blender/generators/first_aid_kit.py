import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "first_aid_kit"
COLOR = (0.9, 0.9, 0.88)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cube(p + "Case", (0, 0, 0.09), (0.16, 0.06, 0.09), accent, 0.012)
    cube(p + "CrossV", (0, -0.062, 0.09), (0.018, 0.004, 0.055), m["dark"])
    cube(p + "CrossH", (0, -0.062, 0.09), (0.055, 0.004, 0.018), m["dark"])
    cube(p + "Handle", (0, 0, 0.2), (0.05, 0.012, 0.012), dark, 0.004)
    cube(p + "Seam", (0, 0, 0.09), (0.162, 0.062, 0.004), dark)

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
