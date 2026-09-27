import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401
from tools.blender.extras import cone, fit_lods, join, material, ring, rod, set_origin  # noqa: E402,F401

NAME = "sample_bottle"
LOD_SEGMENTS = (("LOD0", 18), ("LOD1", 12), ("LOD2", 8))
R = 0.045  # 1 L HDPE sample bottle, total height ~0.27 m


def build(p, s, m):
    plastic, blue, liquid = m
    parts = [
        cylinder(p + "Body", (0, 0, 0.1), R, 0.2, plastic, s),
        cone(p + "Shoulder", (0, 0, 0.2175), R, 0.017, 0.035, plastic, s),
        cylinder(p + "Neck", (0, 0, 0.2405), 0.017, 0.012, plastic, s),
        cylinder(p + "Label", (0, 0, 0.1), R + 0.0008, 0.08, blue, s),
    ]
    if s > 8:
        parts.append(torus(p + "NeckRing", (0, 0, 0.237), 0.0185, 0.0025, plastic, s))
        parts.append(torus(p + "BaseRing", (0, 0, 0.004), R - 0.002, 0.003, plastic, s))
    join(parts, p + "Bottle")
    cap = [cylinder(p + "CapBody", (0, 0, 0.2575), 0.0195, 0.022, blue, s)]
    if s > 8:
        cap.append(torus(p + "CapRim", (0, 0, 0.2475), 0.0195, 0.002, blue, s))
    set_origin(join(cap, p + "Cap"), (0, 0, 0.2465))
    # murky water, pivot at the bottom so runtime can scale Z for level
    set_origin(cylinder(p + "Liquid", (0, 0, 0.0935), R - 0.003, 0.175, liquid, s), (0, 0, 0.006))


def generate():
    reset_scene()
    mats = (
        material("M_HDPE", (0.86, 0.88, 0.86), 0.0, 0.45, alpha=0.45),
        material("M_CapBlue", (0.12, 0.30, 0.65), 0.0, 0.5),
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
