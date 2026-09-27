"""Numpy fallback for tools/blender/textures/bake_textures.py (same names/outputs)."""
import os
import sys

import numpy as np
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else "apps/web/public/textures"
S = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def noise(cells, octaves=5):
    acc = np.zeros((S, S))
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        c = cells * 2**o
        g = rng.random((c, c))
        big = np.tile(g, (3, 3))
        img = Image.fromarray((big * 255).astype(np.uint8)).resize((S * 3, S * 3), Image.BICUBIC)
        acc += amp * np.asarray(img, dtype=float)[S : 2 * S, S : 2 * S] / 255
        tot += amp
        amp *= 0.5
    return acc / tot


def grid(nx, ny, mortar, offset=False):
    y, x = np.mgrid[0:S, 0:S] / S
    row = np.floor(y * ny)
    xs = x * nx + (0.5 * (row % 2) if offset else 0)
    fx, fy = xs % 1, (y * ny) % 1
    m = (np.minimum(fx, 1 - fx) < mortar * nx) | (np.minimum(fy, 1 - fy) < mortar * ny)
    cell = (np.floor(xs) * 13 + row * 7) % 5 / 5
    return m, cell


def lerp(a, b, t):
    return np.asarray(a)[None, None] * (1 - t[..., None]) + np.asarray(b)[None, None] * t[..., None]


def save(name, albedo, height, spec, strength):
    Image.fromarray((np.clip(albedo, 0, 1) * 255).astype(np.uint8)).save(f"{OUT}/{name}_albedo.png")
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * strength
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * strength
    nrm = np.dstack([-dx, dy, np.ones_like(dx)])
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    Image.fromarray(((nrm * 0.5 + 0.5) * 255).astype(np.uint8)).save(f"{OUT}/{name}_normal.png")
    Image.fromarray((np.clip(spec, 0, 1) * 255).astype(np.uint8)).save(f"{OUT}/{name}_spec.png")
    print("generated", name)


n = noise(8)
m, cell = grid(4, 4, 0.004)
alb = lerp((0.70, 0.72, 0.70), (0.80, 0.81, 0.79), 0.6 * n + 0.4 * cell)
alb[m] = (0.35, 0.36, 0.36)
save("tiles", alb, n * 0.2 - m * 1.0, 0.55 - m * 0.4 + n * 0.1, 30)

n = noise(24)
save("plaster", lerp((0.78, 0.77, 0.73), (0.88, 0.87, 0.83), n), n, 0.1 + n * 0.05, 12)

n = noise(40)
m, _ = grid(2, 2, 0.006)
alb = lerp((0.84, 0.84, 0.82), (0.93, 0.93, 0.91), n)
holes = noise(90, 1) > 0.78
alb[holes] *= 0.75
alb[m] = (0.55, 0.55, 0.55)
save("ceiling", alb, n * 0.3 - holes * 0.4 - m, 0.05 + 0 * n, 20)

y, x = np.mgrid[0:S, 0:S] / S
n = noise(6)
rings = (np.sin((y * 14 + n * 3.0) * np.pi * 2) * 0.5 + 0.5) ** 3
fine = noise(64, 2)
alb = lerp((0.48, 0.3, 0.16), (0.66, 0.46, 0.27), 0.6 * (1 - rings) + 0.4 * fine)
save("wood", alb, rings * 0.4 + fine * 0.2, 0.35 + fine * 0.15, 10)

n = noise(10)
brush = noise(200, 1)
alb = lerp((0.42, 0.1, 0.08), (0.58, 0.15, 0.11), 0.7 * n + 0.3 * brush)
y, x = np.mgrid[0:S, 0:S] / S
panel = ((np.abs(x - 0.5) > 0.42) | (np.abs(y - 0.5) > 0.45)) & ~((np.abs(x - 0.5) > 0.46) | (np.abs(y - 0.5) > 0.48))
alb[panel] *= 0.7
save("metal_door", alb, brush * 0.1 - panel * 0.8, 0.55 + brush * 0.2, 25)

n = noise(6)
spots = noise(60, 2)
alb = lerp((0.33, 0.33, 0.32), (0.52, 0.52, 0.5), 0.6 * n + 0.4 * spots)
pores = noise(160, 1) > 0.8
alb[pores] *= 0.7
save("concrete", alb, n * 0.3 + spots * 0.3 - pores * 0.5, 0.12 + spots * 0.08, 18)

n = noise(30)
m, cell = grid(5, 10, 0.004, offset=True)
alb = lerp((0.32, 0.33, 0.35), (0.45, 0.46, 0.48), 0.5 * n + 0.5 * cell)
alb[m] = (0.22, 0.22, 0.23)
save("blocks", alb, n * 0.4 - m * 1.2, 0.08 + n * 0.05, 22)

n = noise(50)
save("rubber", lerp((0.03, 0.03, 0.035), (0.09, 0.09, 0.1), n), n, 0.06 + n * 0.04, 30)

brush = noise(300, 1)
brush = (brush + np.roll(brush, 3, 1) + np.roll(brush, 6, 1)) / 3
save("steel", lerp((0.45, 0.47, 0.5), (0.62, 0.64, 0.67), brush), brush * 0.2, 0.75 + brush * 0.2, 8)
