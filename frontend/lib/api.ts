
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
}

async function getCsrfToken(): Promise<string> {
  const response = await fetch(buildApiUrl("/api/auth/csrf/"), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not obtain the security token. Please try again.");
  }

  const data = await response.json();

  if (typeof data.csrfToken !== "string" || !data.csrfToken) {
    throw new Error("The server did not return a valid security token.");
  }

  return data.csrfToken;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = buildApiUrl(path);
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (unsafeMethods.includes(method)) {
    const csrfToken = await getCsrfToken();
    headers.set("X-CSRFToken", csrfToken);
  }

  return fetch(url, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
}
