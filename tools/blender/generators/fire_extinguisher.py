import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import LODS, cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401

NAME = "fire_extinguisher"
COLOR = (0.8, 0.1, 0.08)
LOD = True
LOD_SEGMENTS = (("LOD0", 24), ("LOD1", 17), ("LOD2", 10))


def build(p, s, m):
    dark, light, accent = m["dark"], m["light"], m["accent"]
    cylinder(p + "Tank", (0, 0, 0.23), 0.08, 0.42, accent, s)
    sphere(p + "Dome", (0, 0, 0.44), (0.08, 0.08, 0.05), accent, s)
    cylinder(p + "Valve", (0, 0, 0.5), 0.022, 0.06, dark, s)
    cube(p + "Handle", (0.03, 0, 0.535), (0.06, 0.012, 0.008), dark)
    cylinder(p + "Hose", (-0.07, 0, 0.35), 0.01, 0.3, dark, max(s // 2, 4), (0, 0.4, 0))
    cylinder(p + "Base", (0, 0, 0.01), 0.082, 0.02, dark, s)

def generate():
    reset_scene()
    mats = palette(COLOR)
    if LOD:
        for level, seg in LOD_SEGMENTS:
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
