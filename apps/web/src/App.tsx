import { useEffect, useState } from "react";
import LabCanvas from "./components/LabCanvas";

export default function App() {
  const [status, setStatus] = useState("Checking connection…");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json() as Promise<{ status: string }>;
      })
      .then((data) =>
        setStatus(data.status === "ok" ? "API connected" : "API error"),
      )
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError")
          setStatus("API unavailable");
      });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <header className="topbar">
        <h1>Piksa VR</h1>
        <span>Virtual laboratory</span>
        <p role="status">{status}</p>
      </header>
      <LabCanvas />
    </main>
  );
}
