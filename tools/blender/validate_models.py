"""Validate exported GLB models and write reports/model-validation.json."""

import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "apps" / "web" / "public" / "models"
REPORT = ROOT / "reports" / "model-validation.json"
LIMITS = {
    "vacuum_filtration": 5000, "vacuum_pump": 4000,
    "parcel_box": 3000, "sample_bottle": 3000, "turbidimeter": 5000, "cuvette": 2000, "erlenmeyer_flask": 3000, "ph_meter": 7000, "buffer_bottle_ph4": 3000, "buffer_bottle_ph7": 3000, "buffer_bottle_ph10": 3000,
    "lab_flask": 2000, "test_tube": 2000, "safety_goggles": 2000, "protective_gloves": 2000,
    "warning_sign": 2000, "control_button": 4000, "control_lever": 4000, "test_tube_rack": 4000,
    "first_aid_kit": 4000, "colored_container_red": 4000, "colored_container_blue": 4000,
    "colored_container_green": 4000, "fire_extinguisher": 4000, "measurement_device": 7000,
    "information_panel": 5000,
}
MIN_TARGETS = {"measurement_device": 3000, "information_panel": 1000}
DEFAULT_MIN_TARGET = 500
LOD_RATIO = {"LOD1": (0.4, 0.6), "LOD2": (0.15, 0.3)}
LOD_MODELS = {"vacuum_filtration", "vacuum_pump", "fire_extinguisher", "measurement_device", "parcel_box", "sample_bottle", "turbidimeter", "cuvette", "erlenmeyer_flask", "ph_meter", "buffer_bottle_ph4", "buffer_bottle_ph7", "buffer_bottle_ph10"}
MAX_BYTES = 2_000_000


def read_glb(path):
    data = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or length != len(data):
        raise ValueError("invalid GLB header")
    size, kind = struct.unpack_from("<II", data, 12)
    if kind != 0x4E4F534A:
        raise ValueError("missing JSON chunk")
    return json.loads(data[20 : 20 + size]), len(data)


def triangles(doc, mesh_index):
    total = 0
    for prim in doc["meshes"][mesh_index]["primitives"]:
        acc = prim.get("indices", prim["attributes"]["POSITION"])
        total += doc["accessors"][acc]["count"] // 3
    return total


def walk(doc, index, lod, out, offset):
    node = doc["nodes"][index]
    name = node.get("name", "")
    for level in ("LOD0", "LOD1", "LOD2"):
        if name.endswith("_" + level):
            lod = level
    t = node.get("translation", [0, 0, 0])
    offset = [offset[i] + t[i] for i in range(3)]
    if "mesh" in node:
        out["tris"][lod] = out["tris"].get(lod, 0) + triangles(doc, node["mesh"])
        for prim in doc["meshes"][node["mesh"]]["primitives"]:
            acc = doc["accessors"][prim["attributes"]["POSITION"]]
            out["min"] = [min(out["min"][i], acc["min"][i] + offset[i]) for i in range(3)]
            out["max"] = [max(out["max"][i], acc["max"][i] + offset[i]) for i in range(3)]
    for child in node.get("children", []):
        walk(doc, child, lod, out, offset)


def validate(name):
    path = MODELS / f"{name}.glb"
    result = {"model": name, "file": str(path.relative_to(ROOT)), "exists": path.exists(), "errors": []}
    if not path.exists():
        result["errors"].append("file missing")
        return result
    try:
        doc, size = read_glb(path)
    except ValueError as exc:
        result["errors"].append(str(exc))
        return result
    roots = [doc["nodes"][i] for i in doc["scenes"][doc.get("scene", 0)]["nodes"]]
    root_idx = next((i for i in doc["scenes"][doc.get("scene", 0)]["nodes"] if doc["nodes"][i].get("name") == name), None)
    out = {"tris": {}, "min": [1e9] * 3, "max": [-1e9] * 3}
    if root_idx is not None:
        walk(doc, root_idx, "LOD0", out, [0, 0, 0])
    dims = [round(out["max"][i] - out["min"][i], 4) for i in range(3)] if out["tris"] else [0, 0, 0]
    external = [b.get("uri") for b in doc.get("buffers", []) + doc.get("images", []) if b.get("uri")]
    lights = doc.get("extensions", {}).get("KHR_lights_punctual", {}).get("lights", [])
    result.update({
        "bytes": size,
        "mesh_primitives": sum(len(m["primitives"]) for m in doc.get("meshes", [])),
        "triangles": out["tris"],
        "materials": len(doc.get("materials", [])),
        "dimensions_m": dims,
        "root_nodes": [n.get("name") for n in roots],
    })
    lod0 = out["tris"].get("LOD0", 0)
    checks = [
        (size <= MAX_BYTES, f"file too large: {size}"),
        (root_idx is not None, "expected root node missing"),
        (result["mesh_primitives"] > 0, "no mesh primitives"),
        (0 < lod0 <= LIMITS[name], f"LOD0 triangles {lod0} > {LIMITS[name]}"),
        (result["materials"] <= 3, "more than 3 materials"),
        (not external, f"external resources: {external}"),
        (0.02 <= max(dims) <= 2.5, f"unexpected scale {dims}"),
        (not doc.get("cameras"), "contains cameras"),
        (not lights, "contains lights"),
    ]
    if name in LOD_MODELS:
        l1, l2 = out["tris"].get("LOD1", 0), out["tris"].get("LOD2", 0)
        r1, r2 = (l1 / lod0, l2 / lod0) if lod0 else (0.0, 0.0)
        result["lod_ratio"] = [1.0, round(r1, 2), round(r2, 2)]
        checks.append((LOD_RATIO["LOD1"][0] <= r1 <= LOD_RATIO["LOD1"][1], f"LOD1 ratio {r1:.2f} not in {LOD_RATIO['LOD1']}"))
        checks.append((LOD_RATIO["LOD2"][0] <= r2 <= LOD_RATIO["LOD2"][1], f"LOD2 ratio {r2:.2f} not in {LOD_RATIO['LOD2']}"))
    target = MIN_TARGETS.get(name, DEFAULT_MIN_TARGET)
    result["warnings"] = [f"LOD0 {lod0} below soft target {target}"] if lod0 < target else []
    result["errors"] = [msg for ok, msg in checks if not ok]
    return result


def main():
    results = [validate(name) for name in LIMITS]
    for r in results:
        r["valid"] = r["exists"] and not r["errors"]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({"models": results, "warnings": sum(len(r.get("warnings", [])) for r in results), "valid": sum(r["valid"] for r in results), "total": len(results)}, indent=2) + "\n")
    for r in results:
        print(f"{'OK ' if r['valid'] else 'ERR'} {r['model']:<26} {r.get('triangles', {})} {r.get('lod_ratio', '')} {'; '.join(r['errors'])}")
    print(f"{sum(r['valid'] for r in results)}/{len(results)} valid -> {REPORT.relative_to(ROOT)}")
    return 0 if all(r["valid"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
