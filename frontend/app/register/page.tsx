"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const response = await apiFetch("/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const details = data.errors || data;
        const fieldErrors =
          details && typeof details === "object"
            ? Object.values(details).flat().join(" ")
            : "";

        throw new Error(
          data.detail ||
            data.error ||
            data.message ||
            fieldErrors ||
            "Unable to create your account. Please check your details."
        );
      }

      sessionStorage.setItem("payat_pending_email", normalizedEmail);
      router.push(
        `/verify-email?email=${encodeURIComponent(normalizedEmail)}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-5 py-8 text-[#14243D]">
      <section className="w-full max-w-sm">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-[#14243D] text-white">
          <Wallet className="h-5 w-5" />
        </div>

        <h1 className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-5 text-[#777A80]">
          Get started with Payat to manage your finances in one place.
        </p>

        <form onSubmit={handleRegister} className="mt-6 space-y-3.5">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-xs font-medium text-[#252B35]"
            >
              Full name
            </label>
            <div className="flex h-11 items-center gap-3 rounded-lg border border-[#DAD9D4] bg-white px-3 transition focus-within:border-[#14243D] focus-within:ring-2 focus-within:ring-[#14243D]/10">
              <UserRound className="h-4 w-4 shrink-0 text-[#747982]" />
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="h-full w-full bg-transparent text-xs outline-none placeholder:text-[#96989C]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-[#252B35]"
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
              className="mb-1.5 block text-xs font-medium text-[#252B35]"
            >
              Password
            </label>
            <div className="flex h-11 items-center gap-3 rounded-lg border border-[#DAD9D4] bg-white px-3 transition focus-within:border-[#14243D] focus-within:ring-2 focus-within:ring-[#14243D]/10">
              <LockKeyhole className="h-4 w-4 shrink-0 text-[#747982]" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="h-full w-full bg-transparent text-xs outline-none placeholder:text-[#96989C]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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
            <p className="mt-1.5 text-[11px] text-[#85878B]">
              Use at least 8 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-xs font-medium text-[#252B35]"
            >
              Confirm password
            </label>
            <div className="flex h-11 items-center gap-3 rounded-lg border border-[#DAD9D4] bg-white px-3 transition focus-within:border-[#14243D] focus-within:ring-2 focus-within:ring-[#14243D]/10">
              <LockKeyhole className="h-4 w-4 shrink-0 text-[#747982]" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter your password again"
                className="h-full w-full bg-transparent text-xs outline-none placeholder:text-[#96989C]"
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
                className="shrink-0 text-[#747982] hover:text-[#14243D]"
              >
                {showConfirmPassword ? (
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
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="mt-5 text-xs text-[#666970]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[#8C7547] hover:text-[#14243D]"
          >
            Sign in
          </Link>
        </p>

        <div className="mt-7 flex items-start gap-3 border-t border-[#DFDED8] pt-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#14243D]" />
          <p className="text-[11px] leading-4 text-[#696C72]">
            Your information is handled securely. Verify your email to
            activate your account.
          </p>
        </div>

        <p className="mt-6 text-[11px] text-[#A0A09D]">
         © 2026 Payat. All rights reserved.
        </p>
      </section>
    </main>
  );
}
