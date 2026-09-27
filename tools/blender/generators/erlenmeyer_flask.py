import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401
from tools.blender.extras import cone, fit_lods, join, material, ring, rod, set_origin  # noqa: E402,F401

NAME = "erlenmeyer_flask"  # 1 L, receives the whole sample bottle
LOD_SEGMENTS = (("LOD0", 24), ("LOD1", 14), ("LOD2", 8))


def glass_radius(z):
    return 0.065 - (z - 0.008) / 0.16 * 0.045


def build(p, s, m):
    glass, water, marks = m
    parts = [
        cylinder(p + "Base", (0, 0, 0.004), 0.065, 0.008, glass, s),
        cone(p + "Body", (0, 0, 0.088), 0.065, 0.02, 0.16, glass, s),
        cylinder(p + "Neck", (0, 0, 0.19), 0.02, 0.045, glass, s),
        torus(p + "Rim", (0, 0, 0.2125), 0.021, 0.0035, glass, s),
    ]
    if s > 8:
        for i, z in enumerate((0.04, 0.07, 0.1)):
            parts.append(ring(p + f"Mark{i}", (0, 0, z), glass_radius(z) + 0.0006, 0.0007, marks, s))
    join(parts, p + "Flask")
    # liquid frustum up to z 0.1; runtime scales Z in 0..1, starts empty
    set_origin(cone(p + "Liquid", (0, 0, 0.053), 0.062, glass_radius(0.1) - 0.003, 0.094, water, s), (0, 0, 0.006))


def generate():
    reset_scene()
    mats = (
        material("M_Glass", (0.86, 0.93, 0.96), 0.0, 0.05, alpha=0.28),
        material("M_MurkyWater", (0.40, 0.31, 0.17), 0.0, 0.15, alpha=0.92),
        material("M_Marks", (0.95, 0.95, 0.95), 0.0, 0.6),
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
