import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "protective_gloves"
COLOR = (0.35, 0.75, 0.45)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    for side in (-1, 1):
        x = side * 0.07
        cube(p + f"Palm{side}", (x, 0, 0.012), (0.04, 0.05, 0.012), accent, 0.006)
        cube(p + f"Cuff{side}", (x, -0.075, 0.012), (0.042, 0.03, 0.013), accent, 0.006)
        for i in range(4):
            cylinder(p + f"Finger{side}_{i}", (x - 0.03 + i * 0.02, 0.075, 0.012), 0.009, 0.05, accent, s, (math.pi / 2, 0, 0))
        cylinder(p + f"Thumb{side}", (x + side * 0.05, 0.02, 0.012), 0.01, 0.04, accent, s, (math.pi / 2, 0, side * 0.7))

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
