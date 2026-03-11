export class FetchError extends Error {
  status: number;
  info: unknown;

  constructor(message: string, status: number, info: unknown) {
    super(message);
    this.status = status;
    this.info = info;
  }
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    let info: unknown;
    try {
      info = await res.json();
    } catch {
      info = await res.text().catch(() => null);
    }
    throw new FetchError(
      `API error: ${res.status} ${res.statusText}`,
      res.status,
      info
    );
  }

  return res.json();
}
