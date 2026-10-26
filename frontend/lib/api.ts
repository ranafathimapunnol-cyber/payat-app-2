
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return cookie
    ? decodeURIComponent(cookie.split("=").slice(1).join("="))
    : undefined;
}

function isUnsafeMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);
}

function isFormData(body: BodyInit | null | undefined): boolean {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function getCsrfToken(): Promise<string> {
  await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
    credentials: "include",
  });

  const csrfToken = getCookie("csrftoken");

  if (!csrfToken) {
    throw new Error(
      "CSRF cookie is missing. Check Django CORS and cookie settings."
    );
  }

  return csrfToken;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();

  const sendRequest = async (): Promise<Response> => {
    const headers = new Headers(options.headers);

    if (isFormData(options.body)) {
      headers.delete("Content-Type");
    } else if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (isUnsafeMethod(method)) {
      headers.set("X-CSRFToken", await getCsrfToken());
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include",
    });
  };

  const response = await sendRequest();

  const excludedPaths = [
    "/api/auth/login/",
    "/api/auth/register/",
    "/api/auth/otp/verify/",
    "/api/auth/token/refresh/",
    "/api/auth/csrf/",
  ];

  if (
    response.status !== 401 ||
    excludedPaths.includes(path) ||
    path.startsWith("/api/auth/logout/")
  ) {
    return response;
  }

  let refreshResponse: Response;

  try {
    refreshResponse = await fetch(
      `${API_BASE_URL}/api/auth/token/refresh/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": await getCsrfToken(),
        },
        body: JSON.stringify({}),
        credentials: "include",
      },
    );
  } catch {
    return response;
  }

  if (!refreshResponse.ok) {
    return response;
  }

  return sendRequest();
}
