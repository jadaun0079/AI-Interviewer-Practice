
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;

export const setToken = (t: string | null) => {
  accessToken = t;
};

// Keep only the backend domain here. Do NOT add /api or /api/v1.
const API_BASE = (
  import.meta.env.VITE_API_URL as string | undefined
)?.replace(/\/+$/, '') || '';

let refreshing: Promise<boolean> | null = null;

function refresh(): Promise<boolean> {
  refreshing ??= fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (r) => {
      if (!r.ok) return false;

      const result = await r.json();
      setToken(result.data.accessToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

interface Opts {
  method?: string;
  body?: unknown;
  form?: FormData;
}

export async function api<T>(
  path: string,
  opts: Opts = {},
): Promise<{ data: T; meta?: Record<string, any> }> {
  const send = () =>
    fetch(`${API_BASE}/api/v1${path}`, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: {
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
      },
      body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
    });

  let res: Response;

  try {
    res = await send();
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the server. Check your connection and try again.',
    );
  }

  // Refresh expired access token once, then retry the original request.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    if (await refresh()) {
      res = await send();
    } else {
      window.dispatchEvent(new Event('auth:expired'));
    }
  }

  if (res.status === 204) {
    return { data: undefined as T };
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const e = json?.error;

    throw new ApiError(
      res.status,
      e?.code ?? 'UNKNOWN',
      e?.message ?? 'Something went wrong. Please try again.',
      e?.details,
    );
  }

  return {
    data: json.data as T,
    meta: json.meta,
  };
}

export const errMsg = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : 'Something went wrong. Please try again.';
