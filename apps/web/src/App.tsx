import { useEffect, useRef, useState } from "react";
import AuthForm from "./auth/AuthForm";
import { authApi, UNAUTHORIZED_EVENT, type User } from "./auth/authApi";
import LabCanvas from "./components/LabCanvas";
import { EditorPanel } from "./editor/EditorPanel";
import { EditorPanel } from "./editor/EditorPanel";

type AuthState = { status: "loading" } | { status: "ready"; user: User | null };

export default function App() {
  const [status, setStatus] = useState("Checking connection…");
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [showEditor, setShowEditor] = useState(false);
  const getSceneRef = useRef<
    (() => import("@babylonjs/core").Scene | null) | null
  >(null);
  const [showEditor, setShowEditor] = useState(false);
  const getSceneRef = useRef<
    (() => import("@babylonjs/core").Scene | null) | null
  >(null);

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

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .catch(() => null)
      .then((user) => active && setAuth({ status: "ready", user }));
    const onUnauthorized = () => setAuth({ status: "ready", user: null });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      active = false;
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  async function handleLogout() {
    await authApi.logout().catch(() => undefined);
    setAuth({ status: "ready", user: null });
  }

  const user = auth.status === "ready" ? auth.user : null;

  return (
    <main>
      <header className="topbar">
        <h1>Piksa VR</h1>
        <span>Virtual laboratory</span>
        <p role="status">{status}</p>
        {user && (
          <div className="user-box">
            <span>{user.login}</span>
            <button type="button" onClick={() => setShowEditor((v) => !v)}>
              Scene editor
            </button>
            <button type="button" onClick={() => setShowEditor((v) => !v)}>
              Scene editor
            </button>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </header>
      {auth.status === "loading" && <p className="auth">Loading…</p>}
      {auth.status === "ready" &&
        (user ? (
          <>
            <LabCanvas
              onRegisterGetScene={(fn) => {
                getSceneRef.current = fn;
              }}
            />
            {showEditor && (
              <EditorPanel
                getScene={() => getSceneRef.current?.() ?? null}
                onClose={() => setShowEditor(false)}
              />
            )}
          </>
        ) : (
          <AuthForm onAuth={(u) => setAuth({ status: "ready", user: u })} />
        ))}
    </main>
  );
}
