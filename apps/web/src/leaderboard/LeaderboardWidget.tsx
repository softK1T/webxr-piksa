import { useEffect, useState } from "react";

interface Entry {
  login: string;
  time_sec: number;
  mistakes: number;
  finished_at: string;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function LeaderboardWidget({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/lb/leaderboard")
      .then((r) => r.json() as Promise<{ results: Entry[] }>)
      .then((d) => setEntries(d.results))
      .catch(() => setError("Failed to load leaderboard"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="overlay">
      <div className="card" style={{ minWidth: 340 }}>
        <h2>🏆 Leaderboard</h2>
        {loading && <p>Loading…</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !error && entries.length === 0 && (
          <p className="muted">No results yet. Be the first!</p>
        )}
        {entries.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>#</th>
                <th style={{ textAlign: "left" }}>Player</th>
                <th style={{ textAlign: "right" }}>Time</th>
                <th style={{ textAlign: "right" }}>Mistakes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={{ borderTop: "1px solid #333" }}>
                  <td>{i + 1}</td>
                  <td>{e.login}</td>
                  <td style={{ textAlign: "right" }}>{fmt(e.time_sec)}</td>
                  <td style={{ textAlign: "right" }}>{e.mistakes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button onClick={onClose} style={{ marginTop: 16 }}>Close</button>
      </div>
    </div>
  );
}
