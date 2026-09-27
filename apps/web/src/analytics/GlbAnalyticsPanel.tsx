import { useState, type ChangeEvent } from "react";

interface GlbStats {
  file_size: number;
  bin_size: number;
  meshes: number;
  primitives: number;
  triangles: number;
  materials: number;
  textures: number;
  images: number;
  animations: number;
  nodes: number;
  skins: number;
  extensions: string[];
}

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function GlbAnalyticsPanel({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<GlbStats | null>(null);
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    setError(null);
    setStats(null);
    setFilename(file.name);
    try {
      const buf = await file.arrayBuffer();
      const res = await fetch("/glb/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: buf,
      });
      const json = await res.json() as GlbStats | { error: string };
      if (!res.ok) throw new Error((json as { error: string }).error);
      setStats(json as GlbStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const rows: [string, string][] = stats
    ? [
        ["File size",   fmt(stats.file_size)],
        ["Binary chunk", fmt(stats.bin_size)],
        ["Meshes",      String(stats.meshes)],
        ["Primitives",  String(stats.primitives)],
        ["Triangles",   stats.triangles.toLocaleString()],
        ["Materials",   String(stats.materials)],
        ["Textures",    String(stats.textures)],
        ["Images",      String(stats.images)],
        ["Animations",  String(stats.animations)],
        ["Nodes",       String(stats.nodes)],
        ["Skins",       String(stats.skins)],
        ["Extensions",  stats.extensions.length ? stats.extensions.join(", ") : "none"],
      ]
    : [];

  return (
    <aside className="editor-panel" aria-label="GLB Analytics">
      <header>
        <h2>📊 GLB Analytics</h2>
        <button onClick={onClose}>Close</button>
      </header>

      <section>
        <label className="file">
          Drop or choose a .glb file
          <input type="file" accept=".glb,model/gltf-binary" onChange={handleFile} />
        </label>
        {loading && <p className="muted">Analysing…</p>}
        {error   && <p role="alert" style={{ color: "#f88" }}>{error}</p>}
      </section>

      {stats && (
        <section>
          <p className="muted" style={{ marginBottom: 8 }}>{filename}</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} style={{ borderTop: "1px solid #333" }}>
                  <td style={{ padding: "4px 0", color: "#aaa" }}>{label}</td>
                  <td style={{ padding: "4px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </aside>
  );
}
