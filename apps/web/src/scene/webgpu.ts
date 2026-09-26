export type RendererKind = "webgl" | "webgpu";

export function requestedRenderer(search: string): RendererKind {
  return new URLSearchParams(search).get("renderer") === "webgpu"
    ? "webgpu"
    : "webgl";
}

export async function detectWebGPU(
  nav: {
    gpu?: { requestAdapter: () => Promise<unknown> };
  } = navigator as never,
): Promise<boolean> {
  if (!nav.gpu) return false;
  try {
    return (await nav.gpu.requestAdapter()) != null;
  } catch {
    return false;
  }
}
