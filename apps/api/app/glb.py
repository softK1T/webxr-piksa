import json
import struct
from typing import Any

MAX_GLB_BYTES = 20 * 1024 * 1024
MAX_TRIANGLES = 150_000
JSON_CHUNK = 0x4E4F534A


class GLBError(ValueError):
    pass


def inspect_glb(data: bytes) -> dict[str, int]:
    """Validate a binary glTF 2.0 file and return basic statistics."""
    if len(data) > MAX_GLB_BYTES:
        raise GLBError("File is too large (max 20 MB)")
    if len(data) < 20:
        raise GLBError("File is too small to be a GLB")
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF":
        raise GLBError("Not a GLB file")
    if version != 2:
        raise GLBError("Only glTF 2.0 is supported")
    if length != len(data):
        raise GLBError("Corrupted GLB: length mismatch")
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != JSON_CHUNK:
        raise GLBError("Missing JSON chunk")
    try:
        doc: dict[str, Any] = json.loads(data[20 : 20 + chunk_length])
    except (ValueError, UnicodeDecodeError) as exc:
        raise GLBError("Invalid JSON chunk") from exc
    meshes = doc.get("meshes") or []
    if not meshes:
        raise GLBError("GLB contains no meshes")
    for key in ("buffers", "images"):
        for item in doc.get(key) or []:
            uri = item.get("uri")
            if uri is not None and not str(uri).startswith("data:"):
                raise GLBError("External resources are not allowed")
    accessors = doc.get("accessors") or []
    triangles = 0
    try:
        for mesh in meshes:
            for primitive in mesh.get("primitives", []):
                if primitive.get("mode", 4) != 4:
                    continue
                index = primitive.get("indices")
                if index is None:
                    index = primitive["attributes"]["POSITION"]
                triangles += int(accessors[index]["count"]) // 3
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise GLBError("Invalid mesh accessors") from exc
    if triangles > MAX_TRIANGLES:
        raise GLBError(f"Too many triangles ({triangles} > {MAX_TRIANGLES})")
    return {
        "meshes": len(meshes),
        "triangles": triangles,
        "materials": len(doc.get("materials") or []),
    }
