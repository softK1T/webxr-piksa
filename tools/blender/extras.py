"""Extra helpers for generators: materials with alpha, cones, joins, pivots."""

import bpy

from tools.blender.common import _done


def material(name, color, metallic=0.0, roughness=0.5, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    if hasattr(mat, "use_nodes") and not mat.use_nodes:
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        for attr, value in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
            if hasattr(mat, attr):
                try:
                    setattr(mat, attr, value)
                except (TypeError, ValueError):
                    pass
    return mat


def cone(name, loc, r1, r2, depth, mat, seg=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=max(seg, 3), radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    return _done(bpy.context.object, name, mat)


def _select(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


def join(objs, name):
    objs = [o for o in objs if o is not None]
    _select(objs)
    if len(objs) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = name
    return obj


def set_origin(obj, point):
    """Move the pivot (hinge / liquid bottom) without moving geometry."""
    bpy.context.scene.cursor.location = point
    _select([obj])
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = (0, 0, 0)
    return obj


def rod(name, a, b, r, mat, seg=8):
    """Cylinder between two points (cables, stand rods)."""
    from mathutils import Vector

    from tools.blender.common import cylinder

    a, b = Vector(a), Vector(b)
    d = b - a
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    return cylinder(name, tuple((a + b) / 2), r, d.length, mat, seg, tuple(rot))


def ring(name, loc, major, minor, mat, seg=12):
    """Thin torus with a fixed 3-sided cross-section (graduation marks, rims)."""
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=max(seg, 6), minor_segments=3, location=loc)
    return _done(bpy.context.object, name, mat)


def _tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def fit_lods(bands=(("LOD1", 0.4, 0.6), ("LOD2", 0.15, 0.3)), min_tris=24):
    """Collapse-decimate LOD1/LOD2 meshes into the validator bands.

    Collapse removes the shortest edges first, i.e. bevel chamfers, so boxes stay boxes.
    Tiny meshes (<= min_tris) are left untouched.
    """
    from tools.blender.common import _clean

    for obj in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
        _clean(obj)  # same cleanup as finalize, so counts match the exported GLB
    groups = {}
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            groups.setdefault(obj.name.split("_")[0], []).append(obj)
    base = sum(_tris(o) for o in groups.get("LOD0", []))
    if not base:
        return
    for level, lo, hi in bands:
        objs = groups.get(level, [])
        for _ in range(6):
            total = sum(_tris(o) for o in objs)
            if total <= hi * base * 0.97:
                break
            target = (lo + hi) / 2 * base
            big = [o for o in objs if _tris(o) > min_tris]
            reducible = sum(_tris(o) for o in big)
            if not reducible:
                break
            factor = max(0.15, (reducible - (total - target)) / reducible)
            for obj in big:
                mod = obj.modifiers.new("FitLod", "DECIMATE")
                mod.decimate_type = "COLLAPSE"
                mod.ratio = factor
                _select([obj])
                bpy.ops.object.modifier_apply(modifier=mod.name)
        total = sum(_tris(o) for o in objs)
        print(f"LODFIT {level} {total}/{base} = {total / base:.2f}", flush=True)


def tube(name, loc, r, depth, thick, mat, seg=12):
    """Open-ended cylinder with real wall thickness (funnel bowls, sleeves)."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=max(seg, 3), radius=r, depth=depth, location=loc, end_fill_type="NOTHING")
    obj = bpy.context.object
    mod = obj.modifiers.new("Wall", "SOLIDIFY")
    mod.thickness = thick
    mod.offset = -1.0
    _select([obj])
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return _done(obj, name, mat)
