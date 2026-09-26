export interface User {
  id: number;
  login: string;
}

export const UNAUTHORIZED_EVENT = "piksa:unauthorized";

export function notifyUnauthorized(): void {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

const MESSAGES: Record<number, string> = {
  401: "Invalid login or password",
  409: "This login is already taken",
  422: "Login: 3–32 letters, digits or _. Password: at least 8 characters",
};

async function submit(path: string, login: string, password: string) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  if (!response.ok) {
    throw new Error(
      MESSAGES[response.status] ?? `Request failed (HTTP ${response.status})`,
    );
  }
  return (await response.json()) as User;
}

export const authApi = {
  me: async (): Promise<User | null> => {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin",
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error("API unavailable");
    return (await response.json()) as User;
  },
  login: (login: string, password: string) => submit("login", login, password),
  register: (login: string, password: string) =>
    submit("register", login, password),
  logout: async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  },
};
