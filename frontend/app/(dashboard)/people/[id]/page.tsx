
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  CircleAlert,
  Coins,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Person = {
  id: number;
  name: string;
  phone: string;
  address?: string;
  status: "ACTIVE" | "DECEASED" | "CLOSED";
  linked_user: number | null;
  invited_email?: string;
  email?: string;
  profile_picture?: string | null;
  profile_pic_url?: string | null;
  profile_pic?: string | null;
  photo?: string | null;
};

type PayatRecord = {
  id?: number;
  mumb_kittuvaan: string | number;
};

type EntryType = "MY_PAYAT" | "IPPOL_PAYATTIYATH";

type PayatEntry = {
  id: number;
  entry_type: EntryType;
  amount: string | number;
  date: string;
  created_at?: string;
  updated_at?: string;
};

type ProfilePictureResponse = {
  person_id?: number;
  profile_picture?: string | null;
  detail?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function requestJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await apiFetch(path, options);
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;

    if (payload && typeof payload === "object") {
      const data = payload as Record<string, unknown>;

      if (typeof data.detail === "string") {
        message = data.detail;
      } else {
        const messages = Object.entries(data).map(([key, value]) => {
          const description = Array.isArray(value)
            ? value.join(", ")
            : String(value);

          return `${key}: ${description}`;
        });

        if (messages.length > 0) {
          message = messages.join(" ");
        }
      }
    }

    throw new Error(message);
  }

  if (response.status === 204 || payload === null) {
    return undefined as T;
  }

  return payload as T;
}

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const numberValue = (
  value: string | number | null | undefined,
): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function getPhotoUrl(person: Person | null): string | null {
  const photo =
    person?.profile_picture ||
    person?.profile_pic_url ||
    person?.profile_pic ||
    person?.photo;

  if (typeof photo !== "string" || !photo.trim()) {
    return null;
  }

  const trimmed = photo.trim();

  if (/^(data:|blob:|https?:\/\/)/i.test(trimmed)) {
    return trimmed;
  }

  return `${API_BASE.replace(/\/+$/, "")}/${trimmed.replace(/^\/+/, "")}`;
}

function today(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string): string {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PersonDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const personId = String(params.id ?? "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [person, setPerson] = useState<Person | null>(null);
  const [record, setRecord] = useState<PayatRecord>({
    mumb_kittuvaan: 0,
  });
  const [entries, setEntries] = useState<PayatEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingRecord, setSavingRecord] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(
    null,
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mumbInput, setMumbInput] = useState("0");
  const [editingMumb, setEditingMumb] = useState(false);

  const [addingType, setAddingType] = useState<EntryType | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDate, setEntryDate] = useState(today());

  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", address: "" });

  const loadData = useCallback(async () => {
    if (!personId || personId === "undefined") {
      setError("The person ID is missing from the page URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const personData = await requestJson<Person>(
        `/api/people/${personId}/`,
      );

      setPerson(personData);
      setProfileForm({
        name: personData.name ?? "",
        phone: personData.phone ?? "",
        address: personData.address ?? "",
      });
      setPhotoLoadFailed(false);

      const results = await Promise.allSettled([
        requestJson<PayatRecord>(
          `/api/people/${personId}/payat-record/`,
        ),
        requestJson<PayatEntry[]>(
          `/api/people/${personId}/payat-entries/`,
        ),
      ]);

      const errors: string[] = [];

      if (results[0].status === "fulfilled") {
        const data = results[0].value ?? {
          mumb_kittuvaan: 0,
        };

        setRecord(data);
        setMumbInput(String(data.mumb_kittuvaan ?? 0));
      } else {
        errors.push("The Payat record could not be loaded.");
      }

      if (results[1].status === "fulfilled") {
        const data = results[1].value;
        setEntries(Array.isArray(data) ? data : []);
      } else {
        errors.push("The Payat entries could not be loaded.");
      }

      if (errors.length > 0) {
        setError(errors.join(" "));
      }
    } catch (err) {
      setPerson(null);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to fetch this member's profile.",
      );
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

 
  const totals = useMemo(() => {
    const myPayat = entries
      .filter((entry) => entry.entry_type === "MY_PAYAT")
      .reduce((sum, entry) => sum + numberValue(entry.amount), 0);

    const ippolPayattiyath = entries
      .filter((entry) => entry.entry_type === "IPPOL_PAYATTIYATH")
      .reduce((sum, entry) => sum + numberValue(entry.amount), 0);

    const mumb = numberValue(record.mumb_kittuvaan);

    // Kodukkan is only the amount by which My Payat exceeds Mumb.
    const kodukkan = Math.max(0, myPayat - mumb);

    // Money already paid through My Payat must not be added again.
    const bakkiKittan = Math.max(
      0,
      mumb + ippolPayattiyath - myPayat,
    );

    return {
      myPayat,
      ippolPayattiyath,
      mumb,
      kodukkan,
      bakkiKittan,
    };
  }, [entries, record]);


  async function saveProfile() {
    if (!person) return;
    if (!profileForm.name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setSavingProfile(true);
    setError("");
    setSuccess("");
    try {
      const updated = await requestJson<Person>(`/api/people/${personId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim(),
          address: profileForm.address.trim(),
        }),
      });
      setPerson(updated);
      setProfileForm({
        name: updated.name ?? "",
        phone: updated.phone ?? "",
        address: updated.address ?? "",
      });
      setEditingProfile(false);
      setSuccess("Personal information saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save personal information.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveMumb() {
    const amount = Number(mumbInput);

    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid non-negative amount.");
      return;
    }

    setSavingRecord(true);
    setError("");
    setSuccess("");

    try {
      const updated = await requestJson<PayatRecord>(
        `/api/people/${personId}/payat-record/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mumb_kittuvaan: amount,
          }),
        },
      );

      const nextRecord = updated ?? {
        ...record,
        mumb_kittuvaan: amount,
      };

      setRecord(nextRecord);
      setMumbInput(String(nextRecord.mumb_kittuvaan ?? amount));
      setEditingMumb(false);
      setSuccess("Mumb Kittuvaan saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the amount.",
      );
    } finally {
      setSavingRecord(false);
    }
  }

  async function addEntry() {
    if (!addingType) return;

    const amount = Number(entryAmount);

    if (!entryDate) {
      setError("Choose a date for this entry.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSavingEntry(true);
    setError("");
    setSuccess("");

    try {
      await requestJson<PayatEntry>(
        `/api/people/${personId}/payat-entries/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entry_type: addingType,
            amount,
            date: entryDate,
          }),
        },
      );

      setAddingType(null);
      setEntryAmount("");
      setEntryDate(today());
      setSuccess("Entry added successfully.");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not add the entry.",
      );
    } finally {
      setSavingEntry(false);
    }
  }

  async function deleteEntry(entry: PayatEntry) {
    const confirmed = window.confirm(
      `Delete the ${money(numberValue(entry.amount))} entry dated ${formatDate(entry.date)}?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingEntryId(entry.id);

    try {
      await requestJson<unknown>(
        `/api/people/${personId}/payat-entries/${entry.id}/`,
        {
          method: "DELETE",
        },
      );

      setEntries((previous) =>
        previous.filter((item) => item.id !== entry.id),
      );

      setSuccess("Entry deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete this entry.",
      );
    } finally {
      setDeletingEntryId(null);
    }
  }

  async function uploadPhoto(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The image must be 5 MB or smaller.");
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("profile_picture", file);

      // This endpoint saves the image to this Person record, not the logged-in User.
      const response = await apiFetch(
        `/api/people/${personId}/profile-picture/`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = (await response.json().catch(() => null)) as
        | ProfilePictureResponse
        | null;

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            `Photo upload failed (${response.status}).`,
        );
      }

      if (
        !data?.profile_picture ||
        (data.person_id != null && Number(data.person_id) !== Number(personId))
      ) {
        throw new Error(
          "The server did not confirm the photo for this person.",
        );
      }

      setPerson((previous) =>
        previous
          ? {
              ...previous,
              profile_picture: data.profile_picture,
              profile_pic_url: null,
              profile_pic: null,
              photo: null,
            }
          : previous,
      );

      setPhotoLoadFailed(false);
      setPhotoVersion(Date.now());
      setSuccess("Person's photo saved successfully.");

      // Confirm the saved image is returned by the person's own detail endpoint.
      await loadData();
      setPhotoLoadFailed(false);
      setPhotoVersion(Date.now());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not upload this person's photo.",
      );
    } finally {
      setUploadingPhoto(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const photoUrl = getPhotoUrl(person);

  const myEntries = entries
    .filter((entry) => entry.entry_type === "MY_PAYAT")
    .sort((a, b) => b.date.localeCompare(a.date));

  const ippolEntries = entries
    .filter((entry) => entry.entry_type === "IPPOL_PAYATTIYATH")
    .sort((a, b) => b.date.localeCompare(a.date));

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#f7f4ed]">
        <div className="flex items-center gap-3 rounded-2xl border border-[#e9e3d7] bg-white px-6 py-5 text-[#172b4d] shadow-sm">
          <LoaderCircle size={21} className="animate-spin" />
          <span className="text-sm font-medium">
            Loading person details…
          </span>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ed] px-5 py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-[#e8e1d5] bg-white p-8 text-center">
          <CircleAlert
            className="mx-auto mb-3 text-[#9a4c42]"
            size={30}
          />

          <h1 className="text-xl font-semibold text-[#172b4d]">
            Profile could not be loaded
          </h1>

          <p className="mt-2 break-words text-sm text-[#77786f]">
            {error ||
              "The person may not exist or the API request failed."}
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => void loadData()}
              className="rounded-xl border border-[#ded6c9] px-5 py-3 text-sm font-semibold text-[#172b4d] hover:bg-[#f7f4ed]"
            >
              Try again
            </button>

            <button
              onClick={() => router.push("/people")}
              className="rounded-xl bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#233e68]"
            >
              Back to People
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-3 py-4 text-slate-800 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => router.push("/people")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6dfd2] bg-white px-4 py-2.5 text-sm font-semibold text-[#263b5c] transition hover:border-[#172b4d]"
          >
            <ArrowLeft size={17} />
            Back to People
          </button>

          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6dfd2] bg-white px-4 py-2.5 text-sm font-semibold text-[#263b5c] transition hover:bg-[#f1ede4]"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#efd0c9] bg-[#fff2ef] px-4 py-3 text-sm text-[#913e34]">
            <CircleAlert className="mt-0.5 shrink-0" size={18} />
            <p className="min-w-0 flex-1 break-words">{error}</p>
            <button
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#d7e7d9] bg-[#eff7ef] px-4 py-3 text-sm text-[#326344]">
            <Check size={18} />
            <p className="flex-1">{success}</p>
            <button
              onClick={() => setSuccess("")}
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[28px] bg-[#172b4d] text-white shadow-[0_18px_50px_-28px_rgba(23,43,77,0.6)]">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-5 -top-14 h-52 w-52 rounded-full border border-white/10" />

          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8 lg:p-10">
            <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
              <div className="h-full w-full overflow-hidden rounded-[28px] border-2 border-white/25 bg-[#f2ecdf] shadow-lg">
                {photoUrl && !photoLoadFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${photoUrl}-${photoVersion}`}
                    src={photoUrl}
                    alt={`${person.name}'s profile`}
                    className="h-full w-full object-cover"
                    onError={() => setPhotoLoadFailed(true)}
                    onLoad={() => setPhotoLoadFailed(false)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#172b4d]">
                    <UserRound size={48} strokeWidth={1.3} />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                title="Change profile picture"
                aria-label="Change profile picture"
                className="absolute -bottom-3 -right-3 flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-[#172b4d] bg-[#eee4cf] text-[#172b4d] transition hover:bg-white disabled:opacity-60"
              >
                {uploadingPhoto ? (
                  <LoaderCircle
                    size={19}
                    className="animate-spin"
                  />
                ) : (
                  <Camera size={19} />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void uploadPhoto(event.target.files?.[0]);
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e7d7b6]">
                Person details
              </p>

              <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                {person.name}
              </h1>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">
                {person.phone && <span>{person.phone}</span>}
                {person.email && <span>{person.email}</span>}
                {person.address && <span>{person.address}</span>}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium transition hover:bg-white/15 disabled:opacity-60"
              >
                <Camera size={16} />
                {uploadingPhoto
                  ? "Uploading picture…"
                  : photoUrl && !photoLoadFailed
                    ? "Change profile picture"
                    : "Add profile picture"}
              </button>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/[0.07] px-5 py-4 sm:min-w-48">
              <p className="text-xs font-medium text-white/65">
                Balance · Bakki Kittan
              </p>
              <p className="mt-2 break-words text-2xl font-semibold text-[#f0dfb9]">
                {money(totals.bakkiKittan)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                Remaining balance
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Personal information</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#172b4d] sm:text-2xl">Contact details</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Keep this person’s contact information up to date.</p>
            </div>
            {!editingProfile ? (
              <button type="button" onClick={() => { setProfileForm({ name: person.name ?? "", phone: person.phone ?? "", address: person.address ?? "" }); setEditingProfile(true); }} className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#172b4d] transition hover:border-[#172b4d] hover:bg-slate-50 sm:w-auto">Edit profile</button>
            ) : null}
          </div>
          {editingProfile ? (
            <form className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
              <label className="block min-w-0 text-sm font-medium text-slate-700">Full name <span className="text-rose-500">*</span>
                <input required maxLength={150} value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="Enter full name" />
              </label>
              <label className="block min-w-0 text-sm font-medium text-slate-700">Phone number
                <input type="tel" maxLength={30} value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="Add phone number" />
              </label>
              <label className="block min-w-0 text-sm font-medium text-slate-700 sm:col-span-2">Address
                <textarea rows={3} maxLength={500} value={profileForm.address} onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))} className="mt-2 w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="House name, street, town, district, PIN code" />
              </label>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={savingProfile} onClick={() => { setEditingProfile(false); setProfileForm({ name: person.name ?? "", phone: person.phone ?? "", address: person.address ?? "" }); }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                <button type="submit" disabled={savingProfile} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#233e68] disabled:cursor-not-allowed disabled:opacity-60">{savingProfile ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{savingProfile ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          ) : (
            <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</p><p className="mt-2 break-words text-sm font-semibold text-slate-900">{person.name || "Not added"}</p></div>
              <div className="min-w-0 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone number</p><p className="mt-2 break-words text-sm font-semibold text-slate-900">{person.phone || "Not added"}</p></div>
              <div className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:col-span-2 lg:col-span-1"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p><p className="mt-2 break-all text-sm font-semibold text-slate-900">{person.email || person.invited_email || "Not added"}</p></div>
              <div className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:col-span-2 lg:col-span-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{person.address || "No address added yet."}</p></div>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Mumb Kittuvaan"
            amount={totals.mumb}
            detail="Amount to be received"
            icon={<Wallet size={20} />}
          />

          <SummaryCard
            title="My Payat"
            amount={totals.myPayat}
            detail={`${myEntries.length} dated entries`}
            icon={<Coins size={20} />}
          />

          <SummaryCard
            title="Kodukkan"
            amount={totals.kodukkan}
            detail="My Payat exceeds Mumb"
            icon={<Wallet size={20} />}
            emphasis="navy"
          />

          <SummaryCard
            title="Bakki Kittan"
            amount={totals.bakkiKittan}
            detail="Mumb exceeds My Payat"
            icon={<Wallet size={20} />}
            emphasis="cream"
          />
        </section>

        <section className="mt-6 rounded-[24px] border border-[#e7dfd2] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c806e]">
                PAYAT record
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#172b4d]">
                Mumb Kittuvaan amount
              </h2>
              <p className="mt-1 text-sm text-[#7c7c76]">
                Updating this amount recalculates the balance.
              </p>
            </div>

            {!editingMumb && (
              <button
                onClick={() => {
                  setMumbInput(String(totals.mumb));
                  setEditingMumb(true);
                }}
                className="rounded-xl border border-[#d9d2c5] px-4 py-2.5 text-sm font-semibold text-[#172b4d] transition hover:bg-[#f7f4ed]"
              >
                Edit amount
              </button>
            )}
          </div>

          {editingMumb ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative max-w-sm flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#827b6f]">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mumbInput}
                  onChange={(event) =>
                    setMumbInput(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#dcd5c9] bg-[#fdfcf9] py-3 pl-9 pr-4 text-sm outline-none focus:border-[#172b4d] focus:ring-2 focus:ring-[#172b4d]/10"
                />
              </div>

              <button
                onClick={() => void saveMumb()}
                disabled={savingRecord}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#243d63] disabled:opacity-60"
              >
                {savingRecord ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Check size={17} />
                )}
                Save amount
              </button>

              <button
                onClick={() => {
                  setMumbInput(String(totals.mumb));
                  setEditingMumb(false);
                }}
                className="rounded-xl border border-[#e5ded2] px-5 py-3 text-sm font-semibold text-[#686960] hover:bg-[#f7f4ed]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="mt-4 text-3xl font-semibold tracking-tight text-[#172b4d]">
              {money(totals.mumb)}
            </p>
          )}
        </section>

        <section className="mt-6 grid items-start gap-6 xl:grid-cols-2">
          <EntryPanel
            title="My Payat"
            subtitle="Record each My Payat payment with its own date."
            entries={myEntries}
            total={totals.myPayat}
            deletingEntryId={deletingEntryId}
            onAdd={() => {
              setError("");
              setAddingType("MY_PAYAT");
              setEntryAmount("");
              setEntryDate(today());
            }}
            onDelete={(entry) => void deleteEntry(entry)}
          />

          <EntryPanel
            title="Ippol Payattiyath"
            subtitle="Keep a dated record of each Ippol Payattiyath entry."
            entries={ippolEntries}
            total={totals.ippolPayattiyath}
            deletingEntryId={deletingEntryId}
            onAdd={() => {
              setError("");
              setAddingType("IPPOL_PAYATTIYATH");
              setEntryAmount("");
              setEntryDate(today());
            }}
            onDelete={(entry) => void deleteEntry(entry)}
          />
        </section>

        {addingType && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#101d33]/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !savingEntry
              ) {
                setAddingType(null);
              }
            }}
          >
            <div className="my-auto w-full max-w-md rounded-[26px] border border-[#e7dfd2] bg-[#fffefa] p-6 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b7b61]">
                    New dated entry
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#172b4d]">
                    {addingType === "MY_PAYAT"
                      ? "Add My Payat"
                      : "Add Ippol Payattiyath"}
                  </h2>
                </div>

                <button
                  onClick={() => setAddingType(null)}
                  disabled={savingEntry}
                  className="rounded-xl p-2 text-[#77776e] hover:bg-[#f1ede4]"
                  aria-label="Close dialog"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addEntry();
                }}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#38465b]">
                    Amount (₹)
                  </span>
                  <input
                    autoFocus
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={entryAmount}
                    onChange={(event) =>
                      setEntryAmount(event.target.value)
                    }
                    placeholder="Enter amount"
                    className="w-full rounded-xl border border-[#ddd5c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#172b4d] focus:ring-2 focus:ring-[#172b4d]/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#38465b]">
                    Entry date
                  </span>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(event) =>
                      setEntryDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-[#ddd5c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#172b4d] focus:ring-2 focus:ring-[#172b4d]/10"
                  />
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddingType(null)}
                    disabled={savingEntry}
                    className="flex-1 rounded-xl border border-[#e0d8cb] px-4 py-3 text-sm font-semibold text-[#555e6b] hover:bg-[#f7f4ed]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingEntry}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#172b4d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#243d63] disabled:opacity-60"
                  >
                    {savingEntry && (
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                    )}
                    Save entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="mt-7 pb-4 text-center text-xs text-[#999184]">
          PAYAT · Person financial record
        </p>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  amount,
  detail,
  icon,
  emphasis = "default",
}: {
  title: string;
  amount: number;
  detail: string;
  icon: ReactNode;
  emphasis?: "default" | "navy" | "cream";
}) {
  const background =
    emphasis === "navy"
      ? "bg-[#172b4d] text-white border-[#172b4d]"
      : emphasis === "cream"
        ? "bg-[#eee5d2] text-[#172b4d] border-[#e2d6bf]"
        : "bg-white text-[#172b4d] border-[#e7dfd2]";

  const muted =
    emphasis === "navy" ? "text-white/60" : "text-[#858174]";

  const iconStyle =
    emphasis === "navy"
      ? "bg-white/10 text-[#f0dfb9]"
      : "bg-[#f4efe4] text-[#172b4d]";

  return (
    <div className={`rounded-[22px] border p-5 shadow-sm ${background}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-medium ${muted}`}>{title}</p>
        <div className={`rounded-xl p-2.5 ${iconStyle}`}>{icon}</div>
      </div>

      <p className="mt-5 break-words text-2xl font-semibold tracking-tight">
        {money(amount)}
      </p>

      <p className={`mt-2 text-xs ${muted}`}>{detail}</p>
    </div>
  );
}

function EntryPanel({
  title,
  subtitle,
  entries,
  total,
  onAdd,
  onDelete,
  deletingEntryId,
}: {
  title: string;
  subtitle: string;
  entries: PayatEntry[];
  total: number;
  onAdd: () => void;
  onDelete: (entry: PayatEntry) => void;
  deletingEntryId: number | null;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e7dfd2] bg-white shadow-sm">
      <div className="border-b border-[#ece5d9] bg-[#fffefa] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#172b4d]">
              {title}
            </h2>
            <p className="mt-1 max-w-sm text-sm leading-5 text-[#858174]">
              {subtitle}
            </p>
          </div>

          <button
            onClick={onAdd}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#172b4d] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243d63] sm:px-4"
          >
            <Plus size={17} />
            Add entry
          </button>
        </div>

        <div className="mt-5 flex items-end justify-between rounded-2xl bg-[#f5f0e6] px-4 py-3.5">
          <span className="text-sm font-medium text-[#6d6a60]">
            Total amount
          </span>
          <span className="text-xl font-semibold text-[#172b4d]">
            {money(total)}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#ddd4c5] px-4 py-9 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3eee4] text-[#172b4d]">
              <Wallet size={21} />
            </div>
            <p className="mt-3 text-sm font-semibold text-[#26344a]">
              No entries yet
            </p>
            <p className="mt-1 text-xs text-[#8b887e]">
              Add an entry to start tracking this total.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl border border-[#eee8de] px-3.5 py-3 transition hover:border-[#d9cfbd] sm:px-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3eee4] text-[#172b4d]">
                  <Coins size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#26344a]">
                    {money(numberValue(entry.amount))}
                  </p>
                  <p className="mt-1 text-xs text-[#8b887e]">
                    {formatDate(entry.date)}
                  </p>
                </div>

                <button
                  onClick={() => onDelete(entry)}
                  disabled={deletingEntryId === entry.id}
                  title="Delete entry"
                  aria-label={`Delete entry ${entry.id}`}
                  className="rounded-xl p-2.5 text-[#a16a60] transition hover:bg-[#fff0ed] hover:text-[#923d33] disabled:opacity-50"
                >
                  {deletingEntryId === entry.id ? (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Trash2 size={17} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function PersonDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f4ed]">
          <LoaderCircle
            className="animate-spin text-[#172b4d]"
            size={28}
          />
        </div>
      }
    >
      <PersonDetailContent />
    </Suspense>
  );
}
