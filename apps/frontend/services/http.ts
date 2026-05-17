import { getBackendUrl } from './config';

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBackendUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; errorCode?: string };
    const err = new Error(body?.message ?? `Request failed with status ${res.status}`) as Error & {
      status: number;
      errorCode?: string;
    };
    err.status = res.status;
    err.errorCode = body?.errorCode;
    throw err;
  }

  return res.json() as Promise<T>;
}
