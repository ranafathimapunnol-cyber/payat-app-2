
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return cookie
    ? decodeURIComponent(cookie.split("=").slice(1).join("="))
    : null;
}

function buildApiUrl(path: string): string {
  // Allow full URLs without adding the API base twice.
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
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
    let csrfToken = getCookie("csrftoken");

    if (!csrfToken) {
      try {
        await fetch(buildApiUrl("/api/auth/csrf/"), {
          method: "GET",
          credentials: "include",
        });

        csrfToken = getCookie("csrftoken");
      } catch {
        // Let the original request report any connection error.
      }
    }

    if (csrfToken) {
      headers.set("X-CSRFToken", csrfToken);
    }
  }

  return fetch(url, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
}
