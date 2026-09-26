import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "test_tube_rack"
COLOR = (0.55, 0.38, 0.22)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cube(p + "Base", (0, 0, 0.01), (0.16, 0.05, 0.01), accent, 0.004)
    cube(p + "Top", (0, 0, 0.1), (0.16, 0.05, 0.008), accent, 0.004)
    for side in (-1, 1):
        cube(p + f"Leg{side}", (side * 0.15, 0, 0.055), (0.008, 0.045, 0.045), dark)
    for i in range(5):
        torus(p + f"Hole{i}", (-0.12 + i * 0.06, 0, 0.109), 0.02, 0.004, dark, s)

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
