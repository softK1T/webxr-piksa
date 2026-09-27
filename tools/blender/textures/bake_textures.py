"""Bake tileable PBR textures for the lab and shooting range in Blender.

Run:  blender -b -P tools/blender/textures/bake_textures.py -- [out_dir] [size]
Writes <name>_albedo.png, <name>_normal.png, <name>_spec.png per material.
The numpy fallback (tools/textures/gen_textures.py) produces the same file set.
"""
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "apps/web/public/textures")
SIZE = int(argv[1]) if len(argv) > 1 else 1024
ONLY = set(argv[2].split(",")) if len(argv) > 2 else None
os.makedirs(OUT, exist_ok=True)

# name: (base colour A, base colour B, roughness, pattern, pattern scale, bump strength)
MATS = {
    "tiles": ((0.78, 0.79, 0.77), (0.70, 0.72, 0.70), 0.45, "brick_tiles", 4, 0.3),
    "plaster": ((0.86, 0.85, 0.81), (0.80, 0.79, 0.75), 0.9, "noise", 18, 0.15),
    "ceiling": ((0.92, 0.92, 0.9), (0.84, 0.84, 0.82), 0.95, "brick_tiles", 2, 0.4),
    "oak": ((0.43, 0.29, 0.16), (0.2, 0.12, 0.06), 0.62, "oak", 3, 0.35),
    "wood": ((0.55, 0.36, 0.2), (0.36, 0.22, 0.12), 0.55, "wave", 6, 0.2),
    "metal_door": ((0.55, 0.14, 0.1), (0.42, 0.1, 0.08), 0.4, "noise", 60, 0.05),
    "concrete": ((0.5, 0.5, 0.49), (0.36, 0.36, 0.35), 0.85, "noise", 8, 0.35),
    "blocks": ((0.42, 0.43, 0.45), (0.33, 0.34, 0.36), 0.9, "brick", 5, 0.5),
    "rubber": ((0.07, 0.07, 0.08), (0.04, 0.04, 0.05), 0.95, "noise", 30, 0.4),
    "steel": ((0.55, 0.57, 0.6), (0.45, 0.47, 0.5), 0.3, "wave", 40, 0.03),
}


def scene_setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 4
    sc.cycles.device = "CPU"
    bpy.ops.mesh.primitive_plane_add(size=2)
    return bpy.context.active_object


def build(mat, spec):
    a, b, rough, pattern, scale, bump = spec
    nt = mat.node_tree
    nt.nodes.clear()
    n = nt.nodes.new
    out = n("ShaderNodeOutputMaterial")
    bsdf = n("ShaderNodeBsdfPrincipled")
    coord = n("ShaderNodeTexCoord")
    noise = n("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale * 3
    noise.inputs["Detail"].default_value = 8
    nt.links.new(coord.outputs["UV"], noise.inputs["Vector"])
    if pattern == "oak":
        # old oak: distorted growth rings, long dark pore streaks, patchy wear
        mapping = n("ShaderNodeMapping")
        mapping.inputs["Scale"].default_value = (1.0, 6.0, 1.0)
        nt.links.new(coord.outputs["UV"], mapping.inputs["Vector"])
        rings = n("ShaderNodeTexWave")
        rings.wave_type = "BANDS"
        rings.bands_direction = "X"
        rings.inputs["Scale"].default_value = scale
        rings.inputs["Distortion"].default_value = 9
        rings.inputs["Detail"].default_value = 6
        rings.inputs["Detail Scale"].default_value = 2
        nt.links.new(coord.outputs["UV"], rings.inputs["Vector"])
        pores = n("ShaderNodeTexNoise")
        pores.inputs["Scale"].default_value = 90
        pores.inputs["Detail"].default_value = 2
        nt.links.new(mapping.outputs["Vector"], pores.inputs["Vector"])
        pore_ramp = n("ShaderNodeValToRGB")
        pore_ramp.color_ramp.elements[0].position = 0.62
        pore_ramp.color_ramp.elements[0].color = (1, 1, 1, 1)
        pore_ramp.color_ramp.elements[1].position = 0.72
        pore_ramp.color_ramp.elements[1].color = (0.45, 0.45, 0.45, 1)
        nt.links.new(pores.outputs["Fac"], pore_ramp.inputs["Fac"])
        wear = n("ShaderNodeTexNoise")
        wear.inputs["Scale"].default_value = 2.5
        wear.inputs["Detail"].default_value = 4
        nt.links.new(coord.outputs["UV"], wear.inputs["Vector"])
        ramp = n("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (*b, 1)
        ramp.color_ramp.elements[1].color = (*a, 1)
        ramp.color_ramp.elements.new(0.55).color = (a[0] * 0.8, a[1] * 0.78, a[2] * 0.75, 1)
        nt.links.new(rings.outputs["Fac"], ramp.inputs["Fac"])
        mul = n("ShaderNodeMix")
        mul.data_type = "RGBA"
        mul.blend_type = "MULTIPLY"
        mul.inputs["Factor"].default_value = 1.0
        nt.links.new(ramp.outputs["Color"], mul.inputs[6])
        nt.links.new(pore_ramp.outputs["Color"], mul.inputs[7])
        worn = n("ShaderNodeMix")
        worn.data_type = "RGBA"
        worn.blend_type = "DARKEN"
        nt.links.new(wear.outputs["Fac"], worn.inputs["Factor"])
        nt.links.new(mul.outputs[2], worn.inputs[6])
        worn.inputs[7].default_value = (0.16, 0.1, 0.05, 1)
        rough_ramp = n("ShaderNodeMapRange")
        rough_ramp.inputs["To Min"].default_value = 0.5
        rough_ramp.inputs["To Max"].default_value = 0.85
        nt.links.new(pores.outputs["Fac"], rough_ramp.inputs["Value"])
        nt.links.new(rough_ramp.outputs["Result"], bsdf.inputs["Roughness"])
        height = n("ShaderNodeMath")
        height.operation = "MULTIPLY_ADD"
        height.inputs[1].default_value = 0.4
        nt.links.new(rings.outputs["Fac"], height.inputs[0])
        nt.links.new(pore_ramp.outputs["Color"], height.inputs[2])
        bmp = n("ShaderNodeBump")
        bmp.inputs["Strength"].default_value = bump
        nt.links.new(height.outputs["Value"], bmp.inputs["Height"])
        nt.links.new(bmp.outputs["Normal"], bsdf.inputs["Normal"])
        nt.links.new(worn.outputs[2], bsdf.inputs["Base Color"])
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
        return nt
    if pattern == "brick" or pattern == "brick_tiles":
        tex = n("ShaderNodeTexBrick")
        tex.inputs["Scale"].default_value = scale
        tex.inputs["Mortar Size"].default_value = 0.01 if pattern == "brick_tiles" else 0.02
        if pattern == "brick_tiles":
            tex.offset = 0.0
            tex.inputs["Brick Width"].default_value = 0.25
            tex.inputs["Row Height"].default_value = 0.25
        tex.inputs["Color1"].default_value = (*a, 1)
        tex.inputs["Color2"].default_value = (*b, 1)
        tex.inputs["Mortar"].default_value = (0.25, 0.25, 0.25, 1)
        fac = tex.outputs["Fac"]
        col = tex.outputs["Color"]
    elif pattern == "wave":
        tex = n("ShaderNodeTexWave")
        tex.inputs["Scale"].default_value = scale
        tex.inputs["Distortion"].default_value = 6
        nt.links.new(coord.outputs["UV"], tex.inputs["Vector"])
        ramp = n("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (*b, 1)
        ramp.color_ramp.elements[1].color = (*a, 1)
        nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
        fac = tex.outputs["Fac"]
        col = ramp.outputs["Color"]
    else:
        ramp = n("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (*b, 1)
        ramp.color_ramp.elements[1].color = (*a, 1)
        nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
        fac = noise.outputs["Fac"]
        col = ramp.outputs["Color"]
    nt.links.new(col, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bmp = n("ShaderNodeBump")
    bmp.inputs["Strength"].default_value = bump
    nt.links.new(fac, bmp.inputs["Height"])
    nt.links.new(bmp.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return nt


def bake(obj, name, kind):
    img = bpy.data.images.new(f"{name}_{kind}", SIZE, SIZE, alpha=False)
    if kind != "albedo":
        img.colorspace_settings.name = "Non-Color"
    nt = obj.active_material.node_tree
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = img
    nt.nodes.active = node
    sc = bpy.context.scene
    if kind == "albedo":
        sc.render.bake.use_pass_direct = False
        sc.render.bake.use_pass_indirect = False
        bpy.ops.object.bake(type="DIFFUSE")
    elif kind == "normal":
        bpy.ops.object.bake(type="NORMAL")
    else:
        bpy.ops.object.bake(type="ROUGHNESS")
        px = list(img.pixels)
        img.pixels = [1 - v if i % 4 != 3 else 1 for i, v in enumerate(px)]
    img.filepath_raw = os.path.join(OUT, f"{name}_{kind}.png")
    img.file_format = "PNG"
    img.save()
    nt.nodes.remove(node)


plane = scene_setup()
for name, spec in MATS.items():
    if ONLY and name not in ONLY:
        continue
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    build(mat, spec)
    plane.data.materials.clear()
    plane.data.materials.append(mat)
    for kind in ("albedo", "normal", "spec"):
        bake(plane, name, kind)
    print("baked", name)
