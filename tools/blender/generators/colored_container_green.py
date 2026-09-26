import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "colored_container_green"
COLOR = (0.12, 0.62, 0.25)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cube(p + "Body", (0, 0, 0.11), (0.13, 0.09, 0.11), accent, 0.012)
    cube(p + "Lid", (0, 0, 0.235), (0.14, 0.1, 0.015), dark, 0.006)
    cube(p + "Handle", (0, 0, 0.26), (0.05, 0.012, 0.01), dark)

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
