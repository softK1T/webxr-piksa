export type XRSupport = "supported" | "unsupported" | "no-webxr" | "insecure";

interface XRLike {
  isSessionSupported(mode: "immersive-vr"): Promise<boolean>;
}

export async function checkXRSupport(
  nav: Navigator = navigator,
  secure: boolean = globalThis.isSecureContext ?? true,
): Promise<XRSupport> {
  if (!secure) return "insecure";
  const xr = (nav as Navigator & { xr?: XRLike }).xr;
  if (!xr) return "no-webxr";
  try {
    return (await xr.isSessionSupported("immersive-vr"))
      ? "supported"
      : "unsupported";
  } catch {
    return "unsupported";
  }
}

export const XR_SUPPORT_TEXT: Record<XRSupport, string> = {
  supported: "VR available",
  unsupported: "No headset detected (immersive-vr not supported)",
  "no-webxr": "This browser does not support WebXR",
  insecure: "WebXR requires HTTPS or localhost",
};
