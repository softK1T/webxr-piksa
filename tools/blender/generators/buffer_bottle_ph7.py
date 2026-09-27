import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.blender.buffer_bottle import generate as build_bottle  # noqa: E402

NAME = "buffer_bottle_ph7"  # pH 7.00 calibration buffer
COLOR = (0.15, 0.60, 0.25)


def generate():
    build_bottle(NAME, COLOR)


if __name__ == "__main__":
    try:
        generate()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)
