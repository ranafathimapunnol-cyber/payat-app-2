
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import {
  GoogleLogin,
  GoogleOAuthProvider,
} from "@react-oauth/google";
import { apiFetch } from "@/lib/api";

function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            "Login failed. Please check your email and password."
        );
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin(credential: string) {
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch("/api/auth/google/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Google sign-in failed. Please try again."
        );
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-5 py-8 text-[#14243D]">
      <section className="w-full max-w-sm">
        <div className="mb-7 flex h-10 w-10 items-center justify-center rounded-lg bg-[#14243D] text-white">
          <Wallet className="h-5 w-5" />
        </div>

        <h1 className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
          Sign in to Payat
        </h1>

        <p className="mt-2 text-sm leading-5 text-[#777A80]">
          Sign in to manage your money and track your finances.
        </p>

        <form onSubmit={handleLogin} className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-xs font-medium text-[#252B35]"
            >
              Email
            </label>

            <div className="flex h-11 items-center gap-3 rounded-lg border border-[#DAD9D4] bg-white px-3 transition focus-within:border-[#14243D] focus-within:ring-2 focus-within:ring-[#14243D]/10">
              <Mail className="h-4 w-4 shrink-0 text-[#747982]" />

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-full w-full bg-transparent text-xs outline-none placeholder:text-[#96989C]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-medium text-[#252B35]"
            >
              Password
            </label>

            <div className="flex h-11 items-center gap-3 rounded-lg border border-[#DAD9D4] bg-white px-3 transition focus-within:border-[#14243D] focus-within:ring-2 focus-within:ring-[#14243D]/10">
              <LockKeyhole className="h-4 w-4 shrink-0 text-[#747982]" />

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-full w-full bg-transparent text-xs outline-none placeholder:text-[#96989C]"
              />

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="shrink-0 text-[#747982] hover:text-[#14243D]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#14243D] text-xs font-medium text-white transition hover:bg-[#203958] focus:outline-none focus:ring-4 focus:ring-[#14243D]/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#DFDED8]" />
          </div>

          <div className="relative flex justify-center">
            <span className="bg-[#FAF9F6] px-3 text-xs text-[#777A80]">
              OR CONTINUE WITH
            </span>
          </div>
        </div>

        <div className="flex min-h-10 justify-center">
          {loading ? (
            <div className="flex h-10 items-center gap-2 text-xs text-[#777A80]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Please wait...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={(response) => {
                if (response.credential) {
                  void handleGoogleLogin(response.credential);
                } else {
                  setError("Google did not return an ID token.");
                }
              }}
              onError={() => {
                setError("Google sign-in was unsuccessful. Please try again.");
              }}
              useOneTap={false}
              theme="outline"
              size="large"
              shape="rectangular"
              text="continue_with"
              width="320"
            />
          )}
        </div>

        <p className="mt-6 text-xs text-[#666970]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-[#8C7547] hover:text-[#14243D]"
          >
            Create account
          </Link>
        </p>

        <div className="mt-9 flex items-start gap-3 border-t border-[#DFDED8] pt-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#14243D]" />

          <p className="text-[11px] leading-4 text-[#696C72]">
            Your account security matters. Your information is protected
            through secure authentication.
          </p>
        </div>

        <p className="mt-7 text-[11px] text-[#A0A09D]">
          © 2026 Payat. All rights reserved.
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return <LoginForm />;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}
