import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401
from tools.blender.extras import cone, fit_lods, join, material, ring, rod, set_origin  # noqa: E402,F401

NAME = "turbidimeter"
LOD_SEGMENTS = (("LOD0", 24), ("LOD1", 14), ("LOD2", 8))
WELL = (0, 0.075)  # cuvette socket (x, y); top of the socket at z 0.081


def build(p, s, m):
    dark, light, lcd = m["dark"], m["light"], m["accent"]
    parts = [
        cube(p + "Shell", (0, 0, 0.03), (0.05, 0.115, 0.03), light, 0.01),
        cube(p + "GripL", (-0.051, -0.01, 0.03), (0.004, 0.08, 0.026), dark),
        cube(p + "GripR", (0.051, -0.01, 0.03), (0.004, 0.08, 0.026), dark),
        cube(p + "Bezel", (0, -0.025, 0.0605), (0.04, 0.045, 0.0012), dark),
        cylinder(p + "Collar", (WELL[0], WELL[1], 0.07), 0.021, 0.022, light, s),
        cylinder(p + "Hole", (WELL[0], WELL[1], 0.0812), 0.0145, 0.001, dark, s),
        cube(p + "Hinge", (0, 0.097, 0.083), (0.008, 0.004, 0.004), dark),
    ]
    if s > 8:
        for i, x in enumerate((-0.03, -0.01, 0.01, 0.03)):
            parts.append(cube(p + f"Key{i}", (x, -0.088, 0.0615), (0.008, 0.006, 0.0018), dark))
        parts.append(cube(p + "Foot", (0, 0.06, 0.002), (0.04, 0.03, 0.002), dark))
    join(parts, p + "Housing")
    cube(p + "Screen", (0, -0.02, 0.0622), (0.034, 0.035, 0.0006), lcd)
    lid = cylinder(p + "Lid", (0, 0.1, 0.105), 0.023, 0.006, dark, s, (math.pi / 2, 0, 0))
    set_origin(lid, (0, 0.097, 0.083))  # hinge; lid is modelled open


def generate():
    reset_scene()
    mats = palette((0.22, 0.42, 0.36))
    for level, seg in LOD_SEGMENTS:
        build(level + "_", seg, mats)
    fit_lods()
    finalize(NAME, lod=True)


if __name__ == "__main__":
    try:
        generate()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)
