import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.common import cube, cylinder, finalize, math, palette, reset_scene, sphere, torus  # noqa: E402,F401
from tools.blender.extras import cone, fit_lods, join, material, ring, rod, set_origin, tube  # noqa: E402,F401

NAME = "vacuum_pump"  # diaphragm pump; port at (-0.155, 0, 0.12), front faces -Y
LOD_SEGMENTS = (("LOD0", 24), ("LOD1", 14), ("LOD2", 8))
GAUGE = (-0.045, 0.11)  # x, z of the vacuum gauge on the front
LEVER_PIVOT = (0.06, -0.096, 0.11)


def build(p, s, m):
    body, dark, light = m["accent"], m["dark"], m["light"]
    ss, detail = max(s // 2, 6), s > 8
    gx, gz = GAUGE
    housing = [
        cube(p + "Body", (0, 0, 0.1), (0.12, 0.09, 0.085), body, 0.012),
        cube(p + "Plinth", (0, 0, 0.01), (0.125, 0.095, 0.01), dark),
        cylinder(p + "Head", (-0.055, 0, 0.2), 0.05, 0.04, dark, s),
        cylinder(p + "HeadCap", (-0.055, 0, 0.225), 0.042, 0.012, light, s),
        cylinder(p + "Port", (-0.14, 0, 0.12), 0.008, 0.03, light, ss, (0, math.pi / 2, 0)),
        cylinder(p + "GaugeRim", (gx, -0.093, gz), 0.032, 0.008, dark, s, (math.pi / 2, 0, 0)),
        cylinder(p + "GaugeFace", (gx, -0.0975, gz), 0.027, 0.002, light, s, (math.pi / 2, 0, 0)),
        cube(p + "SwitchPlate", (LEVER_PIVOT[0], -0.092, LEVER_PIVOT[2]), (0.025, 0.003, 0.035), dark),
    ]
    pts = ((0.03, 0, 0.185), (0.045, 0, 0.228), (0.095, 0, 0.228), (0.11, 0, 0.185))
    housing += [rod(p + f"Handle{i}", pts[i], pts[i + 1], 0.008, dark, ss) for i in range(3)]
    if detail:
        for i in range(4):
            housing.append(cube(p + f"Vent{i}", (0.1215, -0.045 + i * 0.03, 0.1), (0.002, 0.008, 0.05), dark))
        housing.append(rod(p + "Barb", (-0.155, 0, 0.12), (-0.165, 0, 0.12), 0.0095, light, ss))
    join(housing, p + "Housing")
    needle = cube(p + "Needle", (gx, -0.0995, gz + 0.012), (0.0015, 0.0008, 0.012), dark)
    set_origin(needle, (gx, -0.0995, gz))  # rotate about the gauge axis
    lever = [
        rod(p + "LeverArm", LEVER_PIVOT, (0.06, -0.125, 0.145), 0.005, light, ss),
        sphere(p + "LeverKnob", (0.06, -0.125, 0.145), (0.011, 0.011, 0.011), dark, s),
    ]
    set_origin(join(lever, p + "Lever"), LEVER_PIVOT)  # modelled OFF (up); flip about X for ON


def generate():
    reset_scene()
    mats = palette((0.30, 0.40, 0.50))
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
