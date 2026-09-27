import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401
from tools.blender.extras import cone, fit_lods, join, material, ring, rod, set_origin  # noqa: E402,F401

NAME = "parcel_box"
LOD_SEGMENTS = (("LOD0", 8), ("LOD1", 6), ("LOD2", 4))
W, D, H, T = 0.20, 0.15, 0.30, 0.006  # half width, half depth, height, wall


def build(p, s, m):
    card, tape, paper = m
    lod0 = p.startswith("LOD0")
    parts = [
        cube(p + "Bottom", (0, 0, T / 2), (W, D, T / 2), card),
        cube(p + "WallF", (0, -D + T / 2, H / 2), (W, T / 2, H / 2), card),
        cube(p + "WallB", (0, D - T / 2, H / 2), (W, T / 2, H / 2), card),
        cube(p + "WallL", (-W + T / 2, 0, H / 2), (T / 2, D - T, H / 2), card),
        cube(p + "WallR", (W - T / 2, 0, H / 2), (T / 2, D - T, H / 2), card),
        cube(p + "ShipLabel", (0.07, -D - 0.001, 0.15), (0.07, 0.001, 0.05), paper),
        cube(p + "TapeCut", (0, -D - 0.0012, H - 0.075), (0.025, 0.0012, 0.022), tape),
    ]
    if s > 4:
        parts.append(cube(p + "SideLabel", (W + 0.001, 0.03, 0.2), (0.001, 0.05, 0.035), paper))
    join(parts, p + "Box")

    lid = [
        cube(p + "LidTop", (0, 0, H + T / 2), (W + 0.003, D + 0.003, T / 2), card),
        cube(p + "LidLip", (0, -D - 0.003, H - 0.02), (W + 0.003, 0.003, 0.026), card),
        cube(p + "TapeTop", (0, -0.05, H + T + 0.0012), (0.025, 0.103, 0.0012), tape),
        cube(p + "TapeLip", (0, -D - 0.0072, H - 0.02), (0.025, 0.0012, 0.026), tape),
        cube(p + "LidLabel", (0.11, 0.07, H + T + 0.001), (0.06, 0.045, 0.001), paper),
    ]
    set_origin(join(lid, p + "Lid"), (0, D + 0.003, H + T))

    if s > 4:
        note = cube(p + "Note", (0.12, D - 0.02, 0.075), (0.05, 0.0015, 0.065), paper)
        note.rotation_euler = (-0.25, 0, 0)
    if lod0:
        for i, (x, y, r) in enumerate(((-0.14, -0.1, 0.045), (0.13, -0.09, 0.05), (-0.15, 0.1, 0.04), (0.03, -0.11, 0.035), (0.15, 0.03, 0.04))):
            sphere(p + f"Filler{i}", (x, y, T + r * 0.8), (r, r * 0.9, r * 0.8), paper, 6)


def generate():
    reset_scene()
    mats = (
        material("M_Cardboard", (0.55, 0.39, 0.22), 0.0, 0.9),
        material("M_Tape", (0.40, 0.26, 0.11), 0.0, 0.25),
        material("M_Paper", (0.92, 0.91, 0.87), 0.0, 0.8),
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
