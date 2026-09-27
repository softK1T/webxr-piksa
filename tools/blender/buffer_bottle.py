"""Shared builder for the pH calibration buffer bottles (pH 4.01 / 7.00 / 10.01)."""

from tools.blender.common import cylinder, finalize, reset_scene, torus
from tools.blender.extras import cone, fit_lods, join, material, set_origin

LOD_SEGMENTS = (("LOD0", 24), ("LOD1", 14), ("LOD2", 8))


def build(p, s, m):
    plastic, code, label = m
    parts = [
        cylinder(p + "Body", (0, 0, 0.0525), 0.035, 0.105, plastic, s),
        cone(p + "Shoulder", (0, 0, 0.1125), 0.035, 0.02, 0.015, plastic, s),
        cylinder(p + "Neck", (0, 0, 0.124), 0.018, 0.008, plastic, s),
        cylinder(p + "Label", (0, 0, 0.055), 0.0358, 0.06, label, s),
        cylinder(p + "Stripe", (0, 0, 0.072), 0.0362, 0.012, code, s),
    ]
    if s > 8:
        parts.append(torus(p + "BaseRing", (0, 0, 0.003), 0.033, 0.0025, plastic, s))
    join(parts, p + "Bottle")
    cap = [cylinder(p + "CapBody", (0, 0, 0.138), 0.022, 0.02, code, s)]
    if s > 8:
        cap.append(torus(p + "CapRim", (0, 0, 0.129), 0.022, 0.0018, code, s))
    set_origin(join(cap, p + "Cap"), (0, 0, 0.128))
    # buffers are dyed in their code colour; pivot at the bottom for level changes
    set_origin(cylinder(p + "Liquid", (0, 0, 0.045), 0.032, 0.084, code, s), (0, 0, 0.003))


def generate(name, colour):
    reset_scene()
    mats = (
        material("M_BufferPlastic", (0.9, 0.92, 0.92), 0.0, 0.4, alpha=0.4),
        material("M_Code", colour, 0.0, 0.45),
        material("M_Label", (0.95, 0.95, 0.93), 0.0, 0.7),
    )
    for level, seg in LOD_SEGMENTS:
        build(level + "_", seg, mats)
    fit_lods()
    finalize(name, lod=True)
