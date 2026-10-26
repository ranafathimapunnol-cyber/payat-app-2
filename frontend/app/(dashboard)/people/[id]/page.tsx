
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  Wallet,
  X,
  Phone,
  Mail,
  MapPin,
  CircleAlert,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const PAGE_SIZE = 5;

type EntryType = "MY_PAYAT" | "IPPOL_PAYATTIYATH";

type Person = {
  id: number;
  name: string;
  email?: string | null;
  invited_email?: string | null;
  phone?: string | null;
  address?: string | null;
  profile_picture?: string | null;
  photo?: string | null;
  status?: string;
  linked_user?: number | null;
};

type PayatRecord = {
  id?: number;
  mumb_kittuvaan?: number | string | null;
};

type PayatEntry = {
  id: number;
  entry_type: EntryType;
  amount: number | string;
  date: string;
};

type EntryForm = {
  amount: string;
  date: string;
};

type ProfileForm = {
  name: string;
  phone: string;
  address: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function today() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPhotoUrl(value?: string | null) {
  if (!value) return "";

  if (value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) return value;

  return `${API_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
}

function getPersonEmail(person: Person) {
  return person.email || person.invited_email || "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiFetch(path, options);
  const text = await response.text();

  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    let message = "Something went wrong.";

    if (typeof data === "string" && data) {
      message = data.includes("CSRF verification failed")
        ? "Your security token expired. Refresh the page and sign in again if necessary."
        : data;
    } else if (data && typeof data === "object") {
      const body = data as Record<string, unknown>;

      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (typeof body.message === "string") {
        message = body.message;
      } else {
        message = Object.entries(body)
          .map(([key, value]) => {
            const content = Array.isArray(value)
              ? value.join(", ")
              : String(value);
            return `${key}: ${content}`;
          })
          .join(" ");
      }
    }

    throw new Error(message);
  }

  return data as T;
}

function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
}) {
  const variants = {
    primary:
      "bg-[#172B4D] text-white shadow-sm hover:bg-[#243D63] focus-visible:ring-[#172B4D]/30",
    secondary:
      "border border-[#D8D9DF] bg-white text-[#172B4D] hover:border-[#B7BBC5] hover:bg-[#F7F8FA]",
    danger:
      "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
    ghost:
      "text-[#667085] hover:bg-[#F1F3F7] hover:text-[#172B4D]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  const inputClass =
    "w-full rounded-xl border border-[#D8D9DF] bg-white px-3.5 py-3 text-sm text-[#172B4D] outline-none transition placeholder:text-[#98A0AE] focus:border-[#8C7547] focus:ring-4 focus:ring-[#8C7547]/10";

  return (
    <label className="block min-w-0 space-y-2">
      <span className="text-xs font-semibold tracking-wide text-[#475467]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          rows={3}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className={inputClass}
        />
      )}
    </label>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#E2E4E9] bg-white p-4 shadow-[0_3px_12px_rgba(23,43,77,0.025)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-[#172B4D] sm:text-lg">
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 text-xs leading-5 text-[#667085] sm:text-sm">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({
  title,
  value,
  description,
  accent = "navy",
}: {
  title: string;
  value: number;
  description: string;
  accent?: "navy" | "gold";
}) {
  return (
    <div className="group min-w-0 rounded-2xl border border-[#E2E4E9] bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#667085]">{title}</p>
          <p className="mt-3 break-words text-xl font-bold tracking-tight text-[#172B4D] sm:text-2xl">
            {money(value)}
          </p>
          <p className="mt-2 text-[11px] leading-4 text-[#818898]">
            {description}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            accent === "gold"
              ? "bg-[#F5F0E5] text-[#8C7547]"
              : "bg-[#EDF2FA] text-[#172B4D]"
          }`}
        >
          <Wallet size={18} />
        </span>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAECF0] pt-4">
      <p className="text-xs text-[#667085]">
        Page <strong>{page}</strong> of <strong>{totalPages}</strong>
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8D9DF] disabled:opacity-35"
        >
          <ChevronLeft size={16} />
        </button>

        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
          (pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={page === pageNumber ? "page" : undefined}
              className={`h-9 min-w-9 rounded-lg px-2 text-xs font-semibold ${
                page === pageNumber
                  ? "bg-[#172B4D] text-white"
                  : "border border-[#D8D9DF] text-[#172B4D] hover:bg-[#F1F3F7]"
              }`}
            >
              {pageNumber}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8D9DF] disabled:opacity-35"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function EntryPanel({
  title,
  description,
  entryType,
  entries,
  onAdd,
  onDelete,
  saving,
  deletingId,
}: {
  title: string;
  description: string;
  entryType: EntryType;
  entries: PayatEntry[];
  onAdd: (type: EntryType, form: EntryForm) => Promise<void>;
  onDelete: (entry: PayatEntry) => Promise<void>;
  saving: boolean;
  deletingId: number | null;
}) {
  const [form, setForm] = useState<EntryForm>({
    amount: "",
    date: today(),
  });
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageEntries = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return entries.slice(start, start + PAGE_SIZE);
  }, [entries, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.amount || numberValue(form.amount) <= 0) return;

    try {
      await onAdd(entryType, form);
      setForm({ amount: "", date: today() });
      setPage(1);
    } catch {
      // The parent displays the request error.
    }
  }

  return (
    <SectionCard
      title={title}
      description={`${description} · ${entries.length} ${
        entries.length === 1 ? "entry" : "entries"
      }`}
    >
      <form
        onSubmit={submitEntry}
        className="mb-5 grid grid-cols-1 items-end gap-3 rounded-xl border border-[#EAECF0] bg-[#F8F9FB] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:p-4"
      >
        <Field
          label="Amount (₹)"
          type="number"
          value={form.amount}
          onChange={(amount) => setForm((old) => ({ ...old, amount }))}
          placeholder="Enter amount"
          required
        />
        <Field
          label="Date"
          type="date"
          value={form.date}
          onChange={(date) => setForm((old) => ({ ...old, date }))}
          required
        />
        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}
          Add entry
        </Button>
      </form>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D8D9DF] px-4 py-9 text-center">
          <CalendarDays size={25} className="mx-auto mb-3 text-[#8C7547]" />
          <p className="text-sm font-semibold text-[#172B4D]">No entries yet</p>
          <p className="mt-1 text-xs text-[#667085]">
            Add the first dated entry using the form above.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {pageEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#EAECF0] p-3 transition hover:bg-[#FAFBFC] sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF2FA] text-[#172B4D]">
                    <CalendarDays size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-[#172B4D]">
                      {money(numberValue(entry.amount))}
                    </p>
                    <p className="mt-1 text-xs text-[#667085]">
                      {formatDate(entry.date)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void onDelete(entry)}
                  disabled={deletingId === entry.id}
                  aria-label={`Delete entry dated ${entry.date}`}
                  title="Delete entry"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#818898] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  {deletingId === entry.id ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>

          <Pagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </SectionCard>
  );
}

function PersonDetailContent() {
  const params = useParams();
  const router = useRouter();
  const personId = String(params.id ?? params.personId ?? "");

  const [person, setPerson] = useState<Person | null>(null);
  const [record, setRecord] = useState<PayatRecord | null>(null);
  const [entries, setEntries] = useState<PayatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingRecord, setEditingRecord] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: "",
    phone: "",
    address: "",
  });
  const [mumbForm, setMumbForm] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadData = useCallback(async (showLoader = true) => {
    if (!personId) {
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const [personData, recordData, entryData] = await Promise.all([
        requestJson<Person>(`/api/people/${personId}/`),
        requestJson<PayatRecord>(`/api/people/${personId}/payat-record/`),
        requestJson<PayatEntry[] | { results: PayatEntry[] }>(
          `/api/people/${personId}/payat-entries/`,
        ),
      ]);

      const loadedEntries = Array.isArray(entryData)
        ? entryData
        : entryData?.results ?? [];

      setPerson(personData);
      setRecord(recordData);
      setEntries(loadedEntries);

      setProfileForm({
        name: personData.name ?? "",
        phone: personData.phone ?? "",
        address: personData.address ?? "",
      });

      setMumbForm(String(recordData?.mumb_kittuvaan ?? 0));
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const myPayatEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.entry_type === "MY_PAYAT")
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [entries],
  );

  const ippolEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.entry_type === "IPPOL_PAYATTIYATH")
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [entries],
  );

  const myPayat = useMemo(
    () =>
      myPayatEntries.reduce(
        (total, entry) => total + numberValue(entry.amount),
        0,
      ),
    [myPayatEntries],
  );

  const ippolPayattiyath = useMemo(
    () =>
      ippolEntries.reduce(
        (total, entry) => total + numberValue(entry.amount),
        0,
      ),
    [ippolEntries],
  );

  const mumb = numberValue(record?.mumb_kittuvaan);
  const kodukkan = Math.max(0, myPayat - mumb);
  const bakkiKittan = Math.max(0, mumb + ippolPayattiyath - myPayat);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profileForm.name.trim()) {
      setNotice({ type: "error", message: "Full name is required." });
      return;
    }

    setSavingProfile(true);
    setNotice(null);

    try {
      const updated = await requestJson<Person>(
        `/api/people/${personId}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: profileForm.name.trim(),
            phone: profileForm.phone.trim(),
            address: profileForm.address.trim(),
          }),
        },
      );

      // Merge returned fields with the submitted values.
      // Some serializers omit fields such as address or email.
      const merged: Person = {
        ...(person ?? updated),
        ...updated,
        name: updated.name ?? profileForm.name.trim(),
        phone: updated.phone ?? profileForm.phone.trim(),
        address: updated.address ?? profileForm.address.trim(),
        email: updated.email ?? person?.email,
        invited_email: updated.invited_email ?? person?.invited_email,
      };

      setPerson(merged);
      setProfileForm({
        name: merged.name ?? "",
        phone: merged.phone ?? "",
        address: merged.address ?? "",
      });
      setEditingProfile(false);

      // Re-fetch server data without resetting the page or erasing the notice.
      await loadData(false);

      setNotice({
        type: "success",
        message: "Profile updated successfully.",
      });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mumbForm.trim() === "" || numberValue(mumbForm) < 0) {
      setNotice({
        type: "error",
        message: "Enter a valid Mumb Kittuvaan amount.",
      });
      return;
    }

    setSavingRecord(true);
    setNotice(null);

    try {
      const updated = await requestJson<PayatRecord>(
        `/api/people/${personId}/payat-record/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mumb_kittuvaan: numberValue(mumbForm),
          }),
        },
      );

      setRecord((old) => ({ ...old, ...updated }));
      setMumbForm(String(updated.mumb_kittuvaan ?? mumbForm));
      setEditingRecord(false);
      setNotice({
        type: "success",
        message: "Payat record updated successfully.",
      });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error) });
    } finally {
      setSavingRecord(false);
    }
  }

  async function addEntry(type: EntryType, form: EntryForm) {
    setSavingEntry(true);
    setNotice(null);

    try {
      const created = await requestJson<PayatEntry>(
        `/api/people/${personId}/payat-entries/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entry_type: type,
            amount: numberValue(form.amount),
            date: form.date,
          }),
        },
      );

      setEntries((old) => [created, ...old]);
      setNotice({ type: "success", message: "Entry added successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error) });
      throw error;
    } finally {
      setSavingEntry(false);
    }
  }

  async function deleteEntry(entry: PayatEntry) {
    const confirmed = window.confirm(
      `Delete the ${money(numberValue(entry.amount))} entry dated ${formatDate(entry.date)}?`,
    );

    if (!confirmed) return;

    setDeletingId(entry.id);
    setNotice(null);

    try {
      await requestJson<unknown>(
        `/api/people/${personId}/payat-entries/${entry.id}/`,
        { method: "DELETE" },
      );

      setEntries((old) => old.filter((item) => item.id !== entry.id));
      setNotice({ type: "success", message: "Entry deleted successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error) });
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice({ type: "error", message: "Please choose an image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotice({
        type: "error",
        message: "Image size must be 5 MB or less.",
      });
      return;
    }

    setUploadingPhoto(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("profile_picture", file);

      await requestJson<unknown>(
        `/api/people/${personId}/profile-picture/`,
        {
          method: "POST",
          body: formData,
        },
      );

      await loadData(false);

      setNotice({
        type: "success",
        message: "Profile photo uploaded successfully.",
      });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error) });
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#F5F6F8] px-4">
        <div className="text-center">
          <LoaderCircle
            size={30}
            className="mx-auto animate-spin text-[#172B4D]"
          />
          <p className="mt-3 text-sm text-[#667085]">
            Loading person details...
          </p>
        </div>
      </main>
    );
  }

  if (!person) {
    return (
      <main className="min-h-screen bg-[#F5F6F8] px-4 py-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#E2E4E9] bg-white p-7 text-center shadow-sm">
          <UserRound size={32} className="mx-auto text-[#8C7547]" />
          <h1 className="mt-3 text-xl font-bold text-[#172B4D]">
            Person not found
          </h1>
          <p className="mt-2 break-words text-sm text-[#667085]">
            {notice?.message || "Unable to load this person's details."}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => router.back()}>
              <ArrowLeft size={15} />
              Go back
            </Button>
            <Button onClick={() => void loadData()}>
              <RefreshCw size={15} />
              Try again
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const photo = getPhotoUrl(person.profile_picture || person.photo);
  const email = getPersonEmail(person);

  return (
    <main className="min-h-screen min-w-0 bg-[#F5F6F8] px-3 py-5 text-[#172B4D] sm:px-5 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Page heading */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2E4E9] bg-white transition hover:bg-[#EDF2FA]"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7547] sm:text-xs">
                People / Person details
              </p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-[#172B4D] sm:text-3xl">
                Person details
              </h1>
              <p className="mt-1 text-xs text-[#667085] sm:text-sm">
                Manage contact details, balances and transaction history.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>

        {/* Notifications */}
        {notice && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-[#D5E8DC] bg-[#F0F8F3] text-[#245B3B]"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notice.type === "success" ? (
              <Check size={17} className="mt-0.5 shrink-0" />
            ) : (
              <CircleAlert size={17} className="mt-0.5 shrink-0" />
            )}
            <p className="min-w-0 flex-1 break-words">{notice.message}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Person profile */}
        <section className="overflow-hidden rounded-2xl border border-[#E2E4E9] bg-white shadow-[0_4px_20px_rgba(23,43,77,0.035)]">
          <div className="h-1.5 bg-gradient-to-r from-[#172B4D] via-[#334C70] to-[#B29A69]" />

          <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8 lg:p-8">
            {/* Profile photo */}
            <div className="flex min-w-0 flex-row items-center gap-4 lg:flex-col lg:items-start">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E2E4E9] bg-[#F1F3F7] sm:h-28 sm:w-28">
                {photo ? (
                  <img
                    src={photo}
                    alt={`${person.name}'s profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={40} className="text-[#8C7547]" />
                )}

                <label
                  title="Upload profile photo"
                  className="absolute bottom-1.5 right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/30 bg-[#172B4D] text-white shadow-sm transition hover:bg-[#334C70]"
                >
                  {uploadingPhoto ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <ImagePlus size={15} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadPhoto}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="min-w-0 lg:mt-1">
                <span className="inline-flex rounded-full bg-[#F5F0E5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#80683C]">
                  Person profile
                </span>
                <p className="mt-2 text-xs font-medium text-[#667085]">
                  Person ID: {person.id}
                </p>
                {person.status && (
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#245B3B]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3B9360]" />
                    {person.status}
                  </span>
                )}
                {uploadingPhoto && (
                  <p className="mt-2 text-xs text-[#667085]">
                    Uploading photo...
                  </p>
                )}
              </div>
            </div>

            {/* Contact details */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-2xl font-bold tracking-tight text-[#172B4D] sm:text-3xl">
                    {person.name}
                  </h2>
                  <p className="mt-1.5 text-sm text-[#667085]">
                    Contact information
                  </p>
                </div>

                {!editingProfile && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setProfileForm({
                        name: person.name ?? "",
                        phone: person.phone ?? "",
                        address: person.address ?? "",
                      });
                      setEditingProfile(true);
                    }}
                    className="shrink-0"
                  >
                    <Pencil size={14} />
                    Edit profile
                  </Button>
                )}
              </div>

              <div className="mt-5 border-t border-[#EAECF0] pt-5">
                {editingProfile ? (
                  <form onSubmit={saveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field
                        label="Full name"
                        value={profileForm.name}
                        onChange={(name) =>
                          setProfileForm((old) => ({ ...old, name }))
                        }
                        placeholder="Enter full name"
                        required
                      />
                      <Field
                        label="Phone number"
                        value={profileForm.phone}
                        onChange={(phone) =>
                          setProfileForm((old) => ({ ...old, phone }))
                        }
                        placeholder="Enter phone number"
                      />
                      <div className="md:col-span-2">
                        <Field
                          label="Address"
                          value={profileForm.address}
                          onChange={(address) =>
                            setProfileForm((old) => ({ ...old, address }))
                          }
                          placeholder="Enter full address"
                          multiline
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-[#EAECF0] pt-4">
                      <Button
                        variant="secondary"
                        disabled={savingProfile}
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileForm({
                            name: person.name ?? "",
                            phone: person.phone ?? "",
                            address: person.address ?? "",
                          });
                        }}
                      >
                        <X size={14} />
                        Cancel
                      </Button>
                      <Button type="submit" disabled={savingProfile}>
                        {savingProfile ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Save size={15} />
                        )}
                        {savingProfile ? "Saving..." : "Save profile"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-[#EAECF0] bg-[#FAFBFC] p-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDF2FA] text-[#172B4D]">
                        <Phone size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#667085]">
                          Phone number
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-[#172B4D]">
                          {person.phone || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-[#EAECF0] bg-[#FAFBFC] p-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F5F0E5] text-[#80683C]">
                        <Mail size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#667085]">
                          Email address
                        </p>
                        <p className="mt-1 break-all text-sm font-semibold text-[#172B4D]">
                          {email || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-[#EAECF0] bg-[#FAFBFC] p-3.5 sm:col-span-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDF2FA] text-[#172B4D]">
                        <MapPin size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#667085]">
                          Address
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-[#172B4D]">
                          {person.address || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Balance overview */}
        <section>
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7547]">
              Financial summary
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-[#172B4D] sm:text-xl">
              Balance overview
            </h2>
            <p className="mt-1 text-xs text-[#667085] sm:text-sm">
              A quick overview of this person&apos;s Payat balances.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Mumb Kittuvaan"
              value={mumb}
              description="Previous amount"
              accent="gold"
            />
            <SummaryCard
              title="My Payat"
              value={myPayat}
              description="Total of My Payat entries"
            />
            <SummaryCard
              title="Kodukkan"
              value={kodukkan}
              description="My Payat minus Mumb"
            />
            <SummaryCard
              title="Bakki Kittan"
              value={bakkiKittan}
              description="Mumb + Ippol Payattiyath − My Payat"
              accent="gold"
            />
          </div>
        </section>

        {/* Payat record */}
        <SectionCard
          title="Payat record"
          description="Manage the previous balance for this person."
          action={
            !editingRecord ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setMumbForm(String(mumb));
                  setEditingRecord(true);
                }}
              >
                <Pencil size={14} />
                Edit amount
              </Button>
            ) : undefined
          }
        >
          {editingRecord ? (
            <form
              onSubmit={saveRecord}
              className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            >
              <Field
                label="Mumb Kittuvaan (₹)"
                type="number"
                value={mumbForm}
                onChange={setMumbForm}
                placeholder="Enter amount"
                required
              />
              <Button type="submit" disabled={savingRecord}>
                {savingRecord ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Save amount
              </Button>
              <Button
                variant="secondary"
                disabled={savingRecord}
                onClick={() => {
                  setMumbForm(String(mumb));
                  setEditingRecord(false);
                }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#EAECF0] bg-[#F8F9FB] p-4 sm:p-5">
              <div>
                <p className="text-xs font-medium text-[#667085]">
                  Mumb Kittuvaan amount
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[#172B4D]">
                  {money(mumb)}
                </p>
              </div>
              <span className="rounded-lg border border-[#E2E4E9] bg-white px-3 py-2 text-xs font-medium text-[#667085]">
                {record?.id ? `Record #${record.id}` : "Payat record"}
              </span>
            </div>
          )}
        </SectionCard>

        {/* Dated entries */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-2">
          <EntryPanel
            title="My Payat"
            description="Amounts recorded under My Payat"
            entryType="MY_PAYAT"
            entries={myPayatEntries}
            onAdd={addEntry}
            onDelete={deleteEntry}
            saving={savingEntry}
            deletingId={deletingId}
          />
          <EntryPanel
            title="Ippol Payattiyath"
            description="Amounts recorded under Ippol Payattiyath"
            entryType="IPPOL_PAYATTIYATH"
            entries={ippolEntries}
            onAdd={addEntry}
            onDelete={deleteEntry}
            saving={savingEntry}
            deletingId={deletingId}
          />
        </div>

        <footer className="border-t border-[#E2E4E9] py-4 text-center text-[11px] text-[#818898]">
          PAYAT <span className="mx-1.5 text-[#B29A69]">•</span> Person ID{" "}
          {person.id}
        </footer>
      </div>
    </main>
  );
}

export default function PersonDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F5F6F8]">
          <LoaderCircle
            size={28}
            className="animate-spin text-[#172B4D]"
          />
        </main>
      }
    >
      <PersonDetailContent />
    </Suspense>
  );
}
