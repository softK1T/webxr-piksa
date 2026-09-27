import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401
from tools.blender.extras import cone, fit_lods, join, material, ring, rod, set_origin  # noqa: E402,F401

NAME = "cuvette"  # turbidimeter sample cell, fits the 0.0145 m socket
LOD_SEGMENTS = (("LOD0", 24), ("LOD1", 14), ("LOD2", 8))


def build(p, s, m):
    glass, cap, water = m
    vial = [cylinder(p + "Glass", (0, 0, 0.0425), 0.0125, 0.085, glass, s)]
    if s > 8:
        vial.append(cube(p + "Mark", (0, -0.0127, 0.06), (0.0015, 0.0004, 0.008), cap))  # orientation mark
    join(vial, p + "Vial")
    parts = [cylinder(p + "CapBody", (0, 0, 0.092), 0.0135, 0.014, cap, s)]
    if s > 8:
        parts.append(torus(p + "CapRib", (0, 0, 0.0865), 0.0135, 0.0015, cap, s))
    set_origin(join(parts, p + "Cap"), (0, 0, 0.085))
    set_origin(cylinder(p + "Liquid", (0, 0, 0.037), 0.0112, 0.07, water, s), (0, 0, 0.002))


def generate():
    reset_scene()
    mats = (
        material("M_Glass", (0.88, 0.94, 0.97), 0.0, 0.05, alpha=0.3),
        material("M_CapBlack", (0.05, 0.05, 0.06), 0.0, 0.5),
        material("M_MurkyWater", (0.40, 0.31, 0.17), 0.0, 0.15, alpha=0.92),
    )
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
