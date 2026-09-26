"""Run every generator inside one headless Blender process."""

import runpy
import sys
import traceback
from pathlib import Path

GENERATORS = Path(__file__).resolve().parent / "generators"


def main():
    failed = []
    scripts = sorted(p for p in GENERATORS.glob("*.py") if not p.name.startswith("_"))
    for script in scripts:
        print(f"==> {script.stem}", flush=True)
        try:
            runpy.run_path(str(script), run_name="__main__")
        except SystemExit as exc:
            if exc.code:
                failed.append(script.stem)
        except Exception:
            traceback.print_exc()
            failed.append(script.stem)
    print(f"Generated {len(scripts) - len(failed)}/{len(scripts)} models", flush=True)
    if failed:
        print("FAILED: " + ", ".join(failed), file=sys.stderr)
        sys.exit(1)


main()
