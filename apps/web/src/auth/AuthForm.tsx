import { useState, type FormEvent } from "react";
import { authApi, type User } from "./authApi";

type Mode = "login" | "register";

export default function AuthForm({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (isRegister && password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const user = isRegister
        ? await authApi.register(login.trim(), password)
        : await authApi.login(login.trim(), password);
      onAuth(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError(null);
    setConfirm("");
  }

  return (
    <section className="auth">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h2>{isRegister ? "Create account" : "Sign in"}</h2>
        <label>
          Login
          <input
            name="login"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            minLength={3}
            maxLength={32}
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {isRegister && (
          <label>
            Repeat password
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
        )}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>
          {isRegister ? "Register" : "Sign in"}
        </button>
        <button type="button" className="link" onClick={switchMode}>
          {isRegister ? "I already have an account" : "Create an account"}
        </button>
      </form>
    </section>
  );
}
