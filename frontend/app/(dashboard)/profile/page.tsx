
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  LoaderCircle,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Profile = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  role?: string;
  is_blocked?: boolean;
  is_active?: boolean;
  created_at?: string;
  profile_picture?: string | null;
};

type ApiError = {
  detail?: string;
  message?: string;
  profile_picture?: string;
};

const C = {
  cream: "#FAF9F6",
  navy: "#14243D",
  navyLight: "#203958",
  gold: "#8C7547",
  text: "#252B35",
  muted: "#777A80",
  subtle: "#96989C",
  border: "#DFDED8",
  white: "#FFFFFF",
  soft: "#F2F0EA",
};

function displayName(user: Profile) {
  return (
    user.name?.trim() ||
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.username ||
    user.email.split("@")[0]
  );
}

function initials(user: Profile) {
  return (
    displayName(user)
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "P"
  );
}

function dateLabel(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusLabel(user: Profile) {
  if (user.is_blocked) return "Blocked";
  if (user.is_active === false) return "Inactive";
  return "Active";
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DFDED8] bg-[#FAF9F6] text-[#14243D]">
        <Icon size={16} strokeWidth={1.6} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#777A80]">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-[#14243D]">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#DFDED8] bg-white ${className}`}
    >
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/auth/me/");

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load your profile.");
      }

      const data = await response.json();
      const user: Profile = data.user ?? data.profile ?? data;

      if (!user.email) {
        throw new Error("Your account response has no email address.");
      }

      setProfile(user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong loading your profile."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  async function handlePictureChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file || !profile) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("profile_picture", file);

      const response = await apiFetch("/api/auth/profile-picture/", {
        method: "POST",
        body: formData,
      });

      const data: ApiError = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setPreview(null);
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to update your profile picture."
        );
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              profile_picture:
                data.profile_picture ?? current.profile_picture,
            }
          : current
      );

      setPreview(null);
      setSuccess("Profile picture updated successfully.");
    } catch (err) {
      setPreview(null);
      setError(
        err instanceof Error ? err.message : "Picture upload failed."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function copyEmail() {
    if (!profile) return;

    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy the email address.");
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      const response = await apiFetch("/api/auth/logout/", {
        method: "POST",
      });

      if (!response.ok && response.status !== 401) {
        throw new Error("Unable to sign out. Please try again.");
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to sign out."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  const name = profile ? displayName(profile) : "";
  const avatar = preview || profile?.profile_picture || null;
  const status = profile ? statusLabel(profile) : "";
  const active =
    !!profile && !profile.is_blocked && profile.is_active !== false;

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#14243D]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-[#DFDED8] pb-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14243D] text-white">
              <Wallet size={19} />
            </span>

            <span>
              <span className="block text-sm font-semibold tracking-[0.18em]">
                PAYAT
              </span>
              <span className="mt-1 block text-[10px] tracking-wide text-[#777A80]">
                YOUR FINANCIAL COMMUNITY
              </span>
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-[#DFDED8] bg-white px-3.5 py-2.5 text-xs font-medium transition hover:border-[#14243D] hover:bg-[#F2F0EA]"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </header>

        {/* Feedback */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-700"
          >
            <ShieldCheck size={17} className="mt-0.5 shrink-0" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 flex items-center gap-3 rounded-xl border border-[#DFDED8] bg-white p-4 text-xs text-[#14243D]"
          >
            <CheckCircle2 size={17} className="text-[#8C7547]" />
            <p className="flex-1">{success}</p>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Page title */}
        <section className="mb-7">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8C7547]">
            YOUR PAYAT ACCOUNT
          </p>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
            My profile<span className="text-[#8C7547]">.</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[#777A80]">
            Manage your profile picture and view your account details.
          </p>
        </section>

        {loading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#DFDED8] bg-white">
            <LoaderCircle
              size={27}
              className="animate-spin text-[#14243D]"
            />
            <p className="mt-4 text-sm text-[#777A80]">
              Loading your profile...
            </p>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile overview: picture on the left, details beside it */}
            <Card className="overflow-hidden">
              <div className="border-b border-[#DFDED8] px-5 py-4 sm:px-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8C7547]">
                  PROFILE OVERVIEW
                </p>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  {/* Picture */}
                  <div className="flex shrink-0 flex-col items-center sm:items-start">
                    <div className="relative h-28 w-28">
                      <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[#DFDED8] bg-[#F2F0EA] font-serif text-3xl text-[#14243D]">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={`${name}'s profile`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(profile)
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        aria-label="Change profile picture"
                        title="Change profile picture"
                        className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white bg-[#14243D] text-white transition hover:bg-[#203958] disabled:opacity-60"
                      >
                        {uploading ? (
                          <LoaderCircle
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Camera size={15} />
                        )}
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePictureChange}
                        className="hidden"
                      />
                    </div>

                    <p className="mt-4 text-[10px] text-[#777A80]">
                      JPG, PNG or WEBP · Max 5 MB
                    </p>
                  </div>

                  {/* Personal details beside picture */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-[0.17em] text-[#8C7547]">
                          ACCOUNT HOLDER
                        </p>

                        <h2 className="mt-2 break-words font-serif text-2xl tracking-tight sm:text-3xl">
                          {name}
                        </h2>

                        <p className="mt-2 break-all text-sm text-[#777A80]">
                          {profile.email}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[10px] font-medium ${
                              active
                                ? "border-[#DFDED8] bg-[#FAF9F6] text-[#14243D]"
                                : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                active ? "bg-emerald-600" : "bg-red-500"
                              }`}
                            />
                            {status}
                          </span>

                          <span className="rounded-md border border-[#DFDED8] bg-white px-2.5 py-1.5 text-[10px] text-[#777A80]">
                            {(profile.role || "USER").toUpperCase()} ACCOUNT
                          </span>

                          {profile.id !== undefined && (
                            <span className="rounded-md border border-[#DFDED8] bg-white px-2.5 py-1.5 font-mono text-[10px] text-[#777A80]">
                              PAYAT-{String(profile.id).padStart(4, "0")}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void copyEmail()}
                        className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#DFDED8] px-3 py-2.5 text-xs font-medium transition hover:border-[#14243D] hover:bg-[#FAF9F6]"
                      >
                        {copied ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copied ? "Copied" : "Copy email"}
                      </button>
                    </div>

                    <div className="mt-6 grid gap-3 border-t border-[#DFDED8] pt-5 sm:grid-cols-2">
                      <div className="rounded-lg bg-[#FAF9F6] p-4">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[#777A80]">
                          Member since
                        </p>
                        <p className="mt-2 text-sm font-medium text-[#14243D]">
                          {dateLabel(profile.created_at)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-[#FAF9F6] p-4">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[#777A80]">
                          Account role
                        </p>
                        <p className="mt-2 text-sm font-medium text-[#14243D]">
                          {(profile.role || "USER").toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Essential account details only */}
            <Card className="px-5 py-5 sm:px-7 sm:py-6">
              <div className="mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8C7547]">
                  ACCOUNT DETAILS
                </p>
                <h2 className="mt-2 font-serif text-2xl tracking-tight">
                  Personal information
                </h2>
                <p className="mt-2 text-xs leading-5 text-[#777A80]">
                  The information currently associated with your account.
                </p>
              </div>

              <div className="divide-y divide-[#DFDED8] sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
                <DetailRow
                  icon={UserRound}
                  label="Display name"
                  value={name}
                />
                <DetailRow
                  icon={Mail}
                  label="Email address"
                  value={profile.email}
                />
                <DetailRow
                  icon={UserRound}
                  label="Username"
                  value={
                    profile.username
                      ? `@${profile.username}`
                      : "Not provided"
                  }
                />
                <DetailRow
                  icon={ShieldCheck}
                  label="Account status"
                  value={status}
                />
              </div>
            </Card>

            {/* Simple account action */}
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <h2 className="text-sm font-semibold">Sign out of PAYAT</h2>
                <p className="mt-1 text-xs leading-5 text-[#777A80]">
                  End your current session on this device.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#DFDED8] px-4 py-3 text-xs font-medium transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
              >
                {loggingOut ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <LogOut size={15} />
                )}
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </Card>
          </div>
        ) : (
          <Card className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2F0EA] text-[#14243D]">
              <UserRound size={22} />
            </div>

            <h2 className="mt-5 font-serif text-2xl">
              Profile unavailable
            </h2>

            <p className="mt-2 text-xs text-[#777A80]">
              We could not display your account details.
            </p>

            <button
              type="button"
              onClick={() => void loadProfile()}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-[#14243D] px-5 text-xs font-medium text-white transition hover:bg-[#203958]"
            >
              Try again
            </button>
          </Card>
        )}

        <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[#DFDED8] pt-5 text-[10px] text-[#96989C]">
          <span>PAYAT © 2026</span>
          <span className="flex items-center gap-2">
            <ShieldCheck size={13} />
            Your account, your space.
          </span>
        </footer>
      </div>
    </main>
  );
}
