import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "safety_goggles"
COLOR = (0.25, 0.75, 0.95)
LOD = False


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    for side in (-1, 1):
        torus(p + f"Frame{side}", (side * 0.045, 0, 0.035), 0.035, 0.008, dark, s, (math.pi / 2, 0, 0))
        cylinder(p + f"Lens{side}", (side * 0.045, 0, 0.035), 0.033, 0.004, accent, s, (math.pi / 2, 0, 0))
    cube(p + "Bridge", (0, 0, 0.04), (0.012, 0.006, 0.006), dark)
    torus(p + "Strap", (0, 0.05, 0.035), 0.09, 0.004, dark, s)

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
