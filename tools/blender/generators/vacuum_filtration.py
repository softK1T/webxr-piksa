import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401
from tools.blender.extras import cone, fit_lods, join, material, ring, rod, set_origin, tube  # noqa: E402,F401

NAME = "vacuum_filtration"  # 1 L side-arm filter flask + Buchner funnel; hose ends at HOSE_END
LOD_SEGMENTS = (("LOD0", 24), ("LOD1", 14), ("LOD2", 8))
HOSE_END = (0.225, 0.0, 0.12)  # = vacuum_pump port when the pump origin is at (+0.36, 0, 0)


def glass_radius(z):
    return 0.068 - (z - 0.008) / 0.16 * 0.044


def build(p, s, m):
    glass, porcelain, rubber = m
    ss, detail = max(s // 2, 6), s > 8
    flask = [
        cylinder(p + "Base", (0, 0, 0.004), 0.068, 0.008, glass, s),
        cone(p + "Body", (0, 0, 0.088), 0.068, 0.024, 0.16, glass, s),
        cylinder(p + "Neck", (0, 0, 0.193), 0.024, 0.05, glass, s),
        rod(p + "SideArm", (0.022, 0, 0.2), (0.065, 0, 0.188), 0.006, glass, ss),
    ]
    if detail:
        flask.append(torus(p + "Rim", (0, 0, 0.218), 0.025, 0.004, glass, s))
    join(flask, p + "Flask")
    funnel = [
        cone(p + "Adapter", (0, 0, 0.228), 0.021, 0.028, 0.03, rubber, s),
        cylinder(p + "Stem", (0, 0, 0.225), 0.008, 0.07, porcelain, ss),
        cone(p + "Taper", (0, 0, 0.27), 0.012, 0.05, 0.03, porcelain, s),
        tube(p + "Bowl", (0, 0, 0.315), 0.05, 0.06, 0.004, porcelain, s),
        cylinder(p + "Plate", (0, 0, 0.289), 0.046, 0.004, porcelain, s),
    ]
    if detail:
        funnel.append(torus(p + "BowlRim", (0, 0, 0.345), 0.048, 0.004, porcelain, s))
        for i in range(7):
            a, r = i * math.pi / 3, 0.0 if i == 6 else 0.026
            funnel.append(cylinder(p + f"Hole{i}", (r * math.cos(a), r * math.sin(a), 0.2912), 0.004, 0.0006, rubber, 6))
    join(funnel, p + "Funnel")
    # runtime: clone materials to tint the filter (residue) and the liquids per sample profile
    cylinder(p + "Filter", (0, 0, 0.2918), 0.046, 0.0015, porcelain, s)
    set_origin(cylinder(p + "FunnelLiquid", (0, 0, 0.3175), 0.0455, 0.05, glass, s), (0, 0, 0.2925))
    set_origin(cone(p + "Filtrate", (0, 0, 0.053), 0.065, glass_radius(0.1) - 0.003, 0.094, glass, s), (0, 0, 0.006))
    pts = ((0.065, 0, 0.188), (0.1, 0, 0.175), (0.15, 0, 0.13), HOSE_END)
    join([rod(p + f"Hose{i}", pts[i], pts[i + 1], 0.007, rubber, ss) for i in range(3)], p + "Hose")


def generate():
    reset_scene()
    mats = (
        material("M_Glass", (0.86, 0.93, 0.96), 0.0, 0.05, alpha=0.28),
        material("M_Porcelain", (0.93, 0.92, 0.88), 0.0, 0.35),
        material("M_Rubber", (0.50, 0.19, 0.10), 0.0, 0.7),
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
