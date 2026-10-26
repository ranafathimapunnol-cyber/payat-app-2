
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
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
  updated_at?: string;
  profile_picture?: string | null;
};

type ApiError = {
  detail?: string;
  message?: string;
};

function getDisplayName(profile: Profile) {
  return (
    profile.name?.trim() ||
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
    profile.username ||
    profile.email.split("@")[0]
  );
}

function getInitials(profile: Profile) {
  return getDisplayName(profile)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getAccountStatus(profile: Profile) {
  if (profile.is_blocked) return "Blocked";
  if (profile.is_active === false) return "Inactive";
  return "Active";
}

function SectionLabel({
  children,
  number,
}: {
  children: React.ReactNode;
  number: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf3ff] text-[10px] font-bold text-[#315db3]">
        {number}
      </span>
      <h2 className="text-[12px] font-bold uppercase tracking-[0.13em] text-[#64748b]">
        {children}
      </h2>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e8edf5] bg-[#f7f9fd] text-[#4269b3]">
        <Icon size={17} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-[#8b98ac]">
          {label}
        </p>
        <p className="mt-1 break-words text-[12px] font-semibold text-[#233552]">
          {value || "Not provided"}
        </p>
        {subtext && (
          <p className="mt-1 text-[10px] leading-4 text-[#8b98ac]">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
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
        throw new Error("We couldn't load your profile. Please try again.");
      }

      const data = await response.json();
      const user: Profile = data.user ?? data.profile ?? data;

      if (!user.email) {
        throw new Error("Your profile response is missing an email address.");
      }

      setProfile(user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your profile."
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
      if (picturePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(picturePreview);
      }
    };
  }, [picturePreview]);

  async function handlePictureChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file || !profile) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPicturePreview(previewUrl);
    setUploadingPicture(true);

    try {
      const formData = new FormData();
      formData.append("profile_picture", file);

      const response = await apiFetch(
        "/api/auth/profile-picture/",
        {
          method: "POST",
          body: formData,
        }
      );

      const data: ApiError & { profile_picture?: string } =
        await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setPicturePreview(null);
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Your profile picture could not be uploaded."
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

      setPicturePreview(null);
      setSuccess("Your profile picture has been updated.");
    } catch (err) {
      setPicturePreview(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload your profile picture."
      );
    } finally {
      setUploadingPicture(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

  async function copyEmail() {
    if (!profile?.email) return;

    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy the email address.");
    }
  }

  const displayName = profile ? getDisplayName(profile) : "";
  const avatarUrl =
    picturePreview || profile?.profile_picture || null;
  const accountStatus = profile ? getAccountStatus(profile) : "";
  const isAccountActive =
    !!profile && profile.is_active !== false && !profile.is_blocked;

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#1c2d49]">
      <div className="mx-auto w-full max-w-[1450px] px-4 py-5 sm:px-7 sm:py-8 xl:px-10">
        {/* Page heading */}
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] text-[#8a98ad]">
              <Link
                href="/dashboard"
                className="transition hover:text-[#315db3]"
              >
                Workspace
              </Link>
              <ChevronRight size={13} />
              <span className="font-semibold text-[#315db3]">
                My profile
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e0e8f7] bg-white text-[#315db3] shadow-sm">
                <Fingerprint size={21} />
              </div>
              <div>
                <h1 className="text-[24px] font-bold tracking-[-0.04em] text-[#172a49] sm:text-[29px]">
                  Your identity
                </h1>
                <p className="mt-1 text-[11px] text-[#8794a9] sm:text-[12px]">
                  One place for your profile and account details.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e8f2] bg-white px-4 py-2.5 text-[11px] font-semibold text-[#52637c] shadow-sm transition hover:border-[#b8c9e8] hover:text-[#315db3]"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </header>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[12px] text-red-700"
          >
            <Shield size={17} className="mt-0.5 shrink-0" />
            <p className="flex-1 leading-5">{error}</p>
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
            className="mb-5 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-[12px] text-[#2857a5]"
          >
            <CheckCircle2 size={17} />
            <span className="flex-1">{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-[#e6ebf4] bg-white">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf3ff]">
              <LoaderCircle
                size={25}
                className="animate-spin text-[#315db3]"
              />
            </div>
            <p className="text-[13px] font-semibold text-[#273b59]">
              Preparing your profile
            </p>
            <p className="mt-1 text-[11px] text-[#8a98ad]">
              Getting your account details...
            </p>
          </div>
        ) : profile ? (
          <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
            {/* Main identity column */}
            <div className="min-w-0 space-y-5">
              {/* Identity card */}
              <section className="overflow-hidden rounded-[24px] border border-[#e1e8f3] bg-white shadow-[0_8px_32px_rgba(25,48,85,0.035)]">
                <div className="relative overflow-hidden bg-[#142b50] px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
                  <div className="absolute -right-12 -top-28 h-72 w-72 rounded-full border border-white/[0.08]" />
                  <div className="absolute -right-2 -top-16 h-52 w-52 rounded-full border border-white/[0.08]" />
                  <div className="absolute right-10 top-10 h-24 w-24 rounded-full bg-[#4276c5]/20 blur-2xl" />

                  <div className="relative flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#91b5f3]">
                        PAYAT / MEMBER PROFILE
                      </p>
                      <h2 className="mt-2 text-[19px] font-semibold tracking-[-0.03em] text-white sm:text-[23px]">
                        Identity card
                      </h2>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-[#a7c6ff]">
                      <Wallet size={20} />
                    </div>
                  </div>

                  <div className="relative mt-4 flex items-center gap-2 text-[10px] text-[#b9c8df]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8fbcff]" />
                    Your personal account space
                  </div>
                </div>

                <div className="px-5 pb-6 sm:px-8 sm:pb-8">
                  <div className="-mt-11 flex flex-wrap items-end justify-between gap-4">
                    <div className="relative">
                      <div className="relative flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-[27px] border-[5px] border-white bg-[#e9efff] text-[28px] font-bold text-[#315db3] shadow-[0_5px_20px_rgba(18,40,80,0.12)] sm:h-[112px] sm:w-[112px] sm:text-[32px]">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={`${displayName}'s profile`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(profile)
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPicture}
                        aria-label="Change profile picture"
                        title="Change profile picture"
                        className="absolute -bottom-1 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border-[3px] border-white bg-[#315db3] text-white shadow-md transition hover:bg-[#24498e] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingPicture ? (
                          <LoaderCircle
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Camera size={16} />
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

                    <span
                      className={`mb-1 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold ${
                        isAccountActive
                          ? "border-[#d4ecdf] bg-[#eff9f3] text-[#24784e]"
                          : "border-red-200 bg-red-50 text-red-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAccountActive ? "bg-[#29945c]" : "bg-red-500"
                        }`}
                      />
                      {accountStatus}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="break-words text-[23px] font-bold tracking-[-0.045em] text-[#182c4a] sm:text-[28px]">
                        {displayName}
                      </h3>

                      <p className="mt-1 break-all text-[12px] text-[#8290a6]">
                        {profile.email}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf3ff] px-3 py-2 text-[10px] font-bold tracking-wide text-[#315db3]">
                          <ShieldCheck size={13} />
                          {(profile.role || "USER").toUpperCase()}
                        </span>

                        {profile.username && (
                          <span className="rounded-lg border border-[#e5eaf2] bg-[#fafbfd] px-3 py-2 text-[10px] font-medium text-[#65758d]">
                            @{profile.username}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void copyEmail()}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#e4eaf3] px-3 py-2.5 text-[10px] font-semibold text-[#536781] transition hover:border-[#b8c9e8] hover:bg-[#f6f8fd] hover:text-[#315db3]"
                    >
                      {copied ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                      {copied ? "Copied" : "Copy email"}
                    </button>
                  </div>

                  <div className="mt-7 grid grid-cols-1 gap-3 border-t border-[#edf0f6] pt-5 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl bg-[#f7f9fd] p-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#4269b3] shadow-sm">
                        <CalendarDays size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-[#8795aa]">
                          Member since
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-[#2a3e5c]">
                          {formatDate(profile.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-[#f7f9fd] p-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#4269b3] shadow-sm">
                        <Clock3 size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-[#8795aa]">
                          Last profile update
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-[#2a3e5c]">
                          {formatDate(profile.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-[10px] leading-5 text-[#929eb0]">
                    Your profile picture is limited to 5 MB. Use a clear
                    image so other members can recognise you.
                  </p>
                </div>
              </section>

              {/* Personal details */}
              <section className="rounded-[22px] border border-[#e2e8f2] bg-white p-5 shadow-[0_5px_24px_rgba(25,48,85,0.025)] sm:p-7">
                <SectionLabel number="01">
                  Personal details
                </SectionLabel>

                <div className="divide-y divide-[#edf0f6]">
                  <DetailRow
                    icon={UserRound}
                    label="Display name"
                    value={displayName}
                    subtext="The name shown on your profile"
                  />

                  <DetailRow
                    icon={Mail}
                    label="Email address"
                    value={profile.email}
                    subtext="Your registered email address"
                  />

                  <DetailRow
                    icon={Fingerprint}
                    label="Member reference"
                    value={
                      profile.id !== undefined
                        ? `PAYAT-${String(profile.id).padStart(4, "0")}`
                        : "Not available"
                    }
                    subtext="Your account reference, if supplied by the server"
                  />
                </div>
              </section>

              {/* Account activity */}
              <section className="rounded-[22px] border border-[#e2e8f2] bg-white p-5 shadow-[0_5px_24px_rgba(25,48,85,0.025)] sm:p-7">
                <SectionLabel number="02">
                  Account activity
                </SectionLabel>

                <div className="relative ml-2 space-y-6 border-l border-[#dce5f3] pl-6">
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#315db3] text-white ring-4 ring-[#edf3ff]">
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <p className="text-[12px] font-semibold text-[#263a58]">
                      Account created
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-[#8795aa]">
                      {formatDate(profile.created_at)}
                    </p>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#e8efff] text-[#315db3] ring-4 ring-[#f5f7fc]">
                      <Clock3 size={10} />
                    </span>
                    <p className="text-[12px] font-semibold text-[#263a58]">
                      Last profile update
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-[#8795aa]">
                      {formatDate(profile.updated_at)}
                    </p>
                  </div>
                </div>

                <p className="mt-6 rounded-xl border border-[#e8edf5] bg-[#fafbfd] px-4 py-3 text-[10px] leading-5 text-[#8492a7]">
                  This timeline shows the account dates available from
                  your server. It does not represent login history.
                </p>
              </section>
            </div>

            {/* Right rail */}
            <aside className="min-w-0 space-y-5">
              {/* Security panel */}
              <section className="overflow-hidden rounded-[22px] border border-[#e0e7f1] bg-white shadow-[0_5px_24px_rgba(25,48,85,0.025)]">
                <div className="bg-[#f8faff] p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#7c8da8]">
                        ACCOUNT OVERVIEW
                      </p>
                      <h2 className="mt-2 text-[17px] font-bold tracking-tight text-[#203553]">
                        Security & access
                      </h2>
                      <p className="mt-1 text-[10px] leading-5 text-[#8795aa]">
                        A quick view of your account status.
                      </p>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9f0ff] text-[#315db3]">
                      <ShieldCheck size={20} />
                    </div>
                  </div>
                </div>

                <div className="space-y-0 px-5 sm:px-6">
                  <div className="flex items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f7fc] text-[#647a9b]">
                        <Shield size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[#31445f]">
                          Account status
                        </p>
                        <p className="mt-1 text-[9px] text-[#8c99ac]">
                          Current availability
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${
                        isAccountActive
                          ? "bg-[#eaf7ef] text-[#23794d]"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {accountStatus}
                    </span>
                  </div>

                  <div className="border-t border-[#edf0f6]" />

                  <div className="flex items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f7fc] text-[#647a9b]">
                        <KeyRound size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[#31445f]">
                          Access level
                        </p>
                        <p className="mt-1 text-[9px] text-[#8c99ac]">
                          Assigned account role
                        </p>
                      </div>
                    </div>

                    <span className="rounded-lg border border-[#e1e9f7] bg-[#f3f6fc] px-2.5 py-1.5 text-[9px] font-bold text-[#315db3]">
                      {(profile.role || "USER").toUpperCase()}
                    </span>
                  </div>

                  <div className="border-t border-[#edf0f6]" />

                  <div className="flex items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f7fc] text-[#647a9b]">
                        <Mail size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[#31445f]">
                          Email on file
                        </p>
                        <p className="mt-1 text-[9px] text-[#8c99ac]">
                          Registered address
                        </p>
                      </div>
                    </div>

                    <BadgeCheck
                      size={19}
                      className="shrink-0 text-[#315db3]"
                    />
                  </div>
                </div>

                <div className="mx-5 mb-5 rounded-xl border border-[#e5ebf5] bg-[#f8faff] p-3.5 sm:mx-6 sm:mb-6">
                  <div className="flex items-start gap-2.5">
                    <CircleHelp
                      size={15}
                      className="mt-0.5 shrink-0 text-[#6680a8]"
                    />
                    <p className="text-[10px] leading-5 text-[#7888a0]">
                      Email verification status is not exposed by this
                      profile response, so we do not display a verified
                      badge without confirmation from the backend.
                    </p>
                  </div>
                </div>
              </section>

              {/* Welcome card */}
              <section className="relative overflow-hidden rounded-[22px] bg-[#17345f] p-5 text-white sm:p-6">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/[0.09]" />
                <div className="absolute -right-3 -top-3 h-24 w-24 rounded-full border border-white/[0.09]" />
                <div className="absolute bottom-0 right-10 h-20 w-20 rounded-full bg-[#4d7dc6]/20 blur-2xl" />

                <div className="relative">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] text-[#b7d0ff]">
                    <Sparkles size={20} />
                  </div>

                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a6c4f5]">
                    BUILT AROUND TRUST
                  </p>

                  <h2 className="mt-2 text-[20px] font-bold leading-7 tracking-[-0.035em]">
                    Your community.
                    <br />
                    Your account.
                  </h2>

                  <p className="mt-3 max-w-[260px] text-[11px] leading-5 text-[#c2d0e5]">
                    Keep your account details up to date and make your
                    PAYAT experience your own.
                  </p>

                  <Link
                    href="/dashboard"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#17345f] transition hover:bg-[#edf3ff]"
                  >
                    Explore workspace
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </section>

              {/* Quick links */}
              <section className="rounded-[22px] border border-[#e2e8f2] bg-white p-5 shadow-[0_5px_24px_rgba(25,48,85,0.025)] sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8492a7]">
                  QUICK NAVIGATION
                </p>

                <div className="mt-3 divide-y divide-[#edf0f6]">
                  <Link
                    href="/dashboard"
                    className="group flex items-center gap-3 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf3ff] text-[#315db3] transition group-hover:bg-[#dfeaff]">
                      <Wallet size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-[#2b405e]">
                        Home dashboard
                      </p>
                      <p className="mt-1 text-[10px] text-[#8a98ad]">
                        Return to your workspace
                      </p>
                    </div>
                    <ArrowRight
                      size={15}
                      className="text-[#9aa7b9] transition group-hover:translate-x-1 group-hover:text-[#315db3]"
                    />
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="group flex w-full items-center gap-3 py-4 text-left disabled:opacity-60"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0f0] text-[#c74c55] transition group-hover:bg-[#ffe5e5]">
                      {loggingOut ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <LogOut size={17} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-[#2b405e]">
                        {loggingOut ? "Signing out..." : "Sign out"}
                      </p>
                      <p className="mt-1 text-[10px] text-[#8a98ad]">
                        End your current session
                      </p>
                    </div>

                    <ChevronRight
                      size={15}
                      className="text-[#9aa7b9]"
                    />
                  </button>
                </div>
              </section>

              <div className="px-2 text-center">
                <div className="flex items-center justify-center gap-2 text-[10px] text-[#98a4b5]">
                  <ShieldCheck size={13} />
                  PAYAT · Personal account management
                </div>
                <p className="mt-2 text-[9px] leading-4 text-[#a3adbc]">
                  Your account details are provided by PAYAT.
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e3e9f3] bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf3ff] text-[#315db3]">
              <UserRound size={22} />
            </div>
            <h2 className="mt-4 text-[15px] font-bold text-[#263a58]">
              Profile unavailable
            </h2>
            <p className="mt-2 text-[11px] leading-5 text-[#8795aa]">
              We couldn&apos;t display your account details.
            </p>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="mt-5 rounded-xl bg-[#234b88] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#173965]"
            >
              Try again
            </button>
          </div>
        )}

        <footer className="mt-8 border-t border-[#e2e8f1] pt-5 text-center text-[10px] text-[#9aa6b7]">
          PAYAT <span className="mx-1.5">/</span> Member identity
        </footer>
      </div>
    </div>
  );
}
