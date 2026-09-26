"""Shared helpers for procedural low-poly Blender generators."""

import json
import math
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
BLEND_DIR = ROOT / "assets" / "blender"
GLB_DIR = ROOT / "apps" / "web" / "public" / "models"
LODS = (("LOD0", 16), ("LOD1", 8), ("LOD2", 5))
__all__ = ["math", "reset_scene", "palette", "cube", "cylinder", "sphere", "torus", "finalize", "LODS"]


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    units = bpy.context.scene.unit_settings
    units.system = "METRIC"
    units.scale_length = 1.0


def _material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    if hasattr(mat, "use_nodes") and not mat.use_nodes:
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def palette(accent):
    return {
        "dark": _material("M_Dark", (0.10, 0.13, 0.16), 0.2, 0.55),
        "light": _material("M_Light", (0.78, 0.86, 0.88), 0.0, 0.35),
        "accent": _material("M_Accent", accent, 0.05, 0.55),
    }


def _done(obj, name, mat):
    obj.name = name
    obj.data.name = name
    obj.data.materials.append(mat)
    return obj


def cube(name, loc, half, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=loc)
    obj = bpy.context.object
    obj.scale = half
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return _done(obj, name, mat)


def cylinder(name, loc, radius, depth, mat, seg=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=max(seg, 3), radius=radius, depth=depth, location=loc, rotation=rot)
    return _done(bpy.context.object, name, mat)


def sphere(name, loc, scale, mat, seg=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=max(seg, 4), ring_count=max(seg // 2, 3), location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _done(obj, name, mat)


def torus(name, loc, major, minor, mat, seg=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=max(seg, 6), minor_segments=max(seg // 2, 3), location=loc, rotation=rot)
    return _done(bpy.context.object, name, mat)


def _clean(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    for poly in obj.data.polygons:
        poly.use_smooth = False


def finalize(name, lod=False):
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"{name}: no geometry")
    for obj in meshes:
        _clean(obj)
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    groups = {}
    if lod:
        for level, _ in LODS:
            group = bpy.data.objects.new(f"{name}_{level}", None)
            bpy.context.collection.objects.link(group)
            group.parent = root
            groups[level] = group
    for obj in meshes:
        obj.parent = groups.get(obj.name.split("_")[0], root)
    for block in list(bpy.data.materials):
        if block.users == 0:
            bpy.data.materials.remove(block)
    BLEND_DIR.mkdir(parents=True, exist_ok=True)
    GLB_DIR.mkdir(parents=True, exist_ok=True)
    blend, glb = BLEND_DIR / f"{name}.blend", GLB_DIR / f"{name}.glb"
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", export_cameras=False, export_lights=False, export_apply=True, export_yup=True)
    tris = {}
    for obj in meshes:
        key = obj.name.split("_")[0] if lod else "LOD0"
        tris[key] = tris.get(key, 0) + sum(len(p.vertices) - 2 for p in obj.data.polygons)
    info = {
        "model": name,
        "vertices": sum(len(o.data.vertices) for o in meshes),
        "triangles": tris,
        "materials": len({m.name for o in meshes for m in o.data.materials if m}),
        "blend": str(blend),
        "glb": str(glb),
    }
    print("MODEL " + json.dumps(info), flush=True)
    return info
