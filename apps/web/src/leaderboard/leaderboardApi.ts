export interface ResultPayload {
  user_id: number;
  login: string;
  time_sec: number;
  mistakes: number;
}

export async function submitResult(payload: ResultPayload): Promise<void> {
  await fetch("/lb/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
