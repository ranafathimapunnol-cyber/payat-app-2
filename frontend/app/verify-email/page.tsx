"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, Mail, ShieldCheck, LoaderCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email) {
      setError("Email address is missing. Please register again.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/api/auth/otp/verify/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            data.otp?.[0] ||
            data.email?.[0] ||
            "Verification failed. Check your code and try again."
        );
      }

      router.replace("/login?verified=true");
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
    <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-4 py-8 text-[#14243D]">
      <section className="w-full max-w-sm">
        <Link
          href="/login"
          className="mb-8 flex items-center justify-center gap-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14243D] text-white">
            <Wallet size={18} />
          </span>
          <span className="text-lg font-semibold tracking-tight">PAYAT</span>
        </Link>

        <div className="rounded-2xl border border-[#DAD9D4] bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F4F8]">
            <Mail size={19} />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Verify your email
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#777A80]">
            Enter the 6-digit code sent to your email address.
          </p>

          <p className="mt-3 break-all text-xs font-medium">{email}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="otp"
                className="mb-1.5 block text-xs font-medium"
              >
                Verification code
              </label>

              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit code"
                required
                className="w-full rounded-lg border border-[#DAD9D4] bg-white px-3 py-2.5 text-xs tracking-[0.2em] outline-none transition focus:border-[#14243D] focus:ring-2 focus:ring-[#14243D]/10"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-xs text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#14243D] px-4 py-3 text-xs font-medium text-white transition hover:bg-[#203958] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  Verify email
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[#777A80]">
            Already verified?{" "}
            <Link
              href="/login"
              className="font-medium text-[#8C7547] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[10px] text-[#777A80]">
          © 2026 Payat. All rights reserved.
        </p>
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] text-xs text-[#14243D]">
          Loading email verification...
        </main>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}