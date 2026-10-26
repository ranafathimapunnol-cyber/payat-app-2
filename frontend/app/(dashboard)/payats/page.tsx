
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Users,
  Search,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  LoaderCircle,
  CircleAlert,
  X,
  CheckCircle2,
  RefreshCw,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type ViewMode = "choose" | "owner" | "member";
type EntryType = "MY_PAYAT" | "IPPOL_PAYATTIYATH";

type Person = {
  id: number;
  name: string;
};

type PersonEntry = {
  id: number;
  personId: number;
  personName: string;
  entry_type: EntryType;
  amount: number;
  date: string;
};

type DateGroup = {
  id: string;
  date: string;
  entries: PersonEntry[];
};

type Obj = Record<string, unknown>;

const THEME = {
  cream: "#FAF9F6",
  navy: "#14243D",
  navyHover: "#203958",
  gold: "#8C7547",
  text: "#252B35",
  muted: "#777A80",
  subtle: "#96989C",
  border: "#DFDED8",
  soft: "#F2F0EA",
};

function obj(value: unknown): Obj | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Obj)
    : null;
}

function idOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  const item = obj(value);
  if (!item) return null;

  for (const key of ["id", "pk", "user_id", "person_id"]) {
    const result = idOf(item[key]);
    if (result !== null) return result;
  }

  return null;
}

function listOf(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;

  const item = obj(value);
  if (!item) return null;

  for (const key of ["results", "data", "people", "items"]) {
    if (Array.isArray(item[key])) return item[key] as unknown[];
  }

  if (item.data !== undefined) return listOf(item.data);
  return null;
}

function errorOf(value: unknown, fallback: string): string {
  const item = obj(value);
  if (typeof item?.detail === "string") return item.detail;
  if (typeof item?.message === "string") return item.message;
  if (typeof item?.error === "string") return item.error;
  return fallback;
}

function dateOnly(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";

  const raw = value.trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  const slash = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value: string): string {
  const normalized = dateOnly(value);
  if (!normalized) return "Date unavailable";

  const [year, month, day] = normalized.split("-").map(Number);

  return new Date(year, month - 1, day, 12).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function calendarParts(value: string) {
  const normalized = dateOnly(value);
  if (!normalized) return { day: "—", month: "DATE" };

  const [year, month, day] = normalized.split("-").map(Number);

  return {
    day: String(day),
    month: new Date(year, month - 1, day, 12).toLocaleDateString("en-IN", {
      month: "short",
    }),
  };
}

function money(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function normalizePerson(value: unknown): Person | null {
  const item = obj(value);
  if (!item) return null;

  const id = idOf(item.id ?? item.pk);
  if (id === null) return null;

  const name =
    (typeof item.name === "string" && item.name.trim()) ||
    (typeof item.full_name === "string" && item.full_name.trim()) ||
    (typeof item.username === "string" && item.username.trim()) ||
    `Person #${id}`;

  return { id, name };
}

function normalizeEntry(value: unknown, person: Person): PersonEntry | null {
  const item = obj(value);
  if (!item) return null;

  const entryType = item.entry_type;
  if (entryType !== "MY_PAYAT" && entryType !== "IPPOL_PAYATTIYATH") {
    return null;
  }

  const id = idOf(item.id ?? item.pk);
  const date = dateOnly(item.date);
  const amount = Number(item.amount);

  if (id === null || !date || !Number.isFinite(amount)) return null;

  return {
    id,
    personId: person.id,
    personName: person.name,
    entry_type: entryType,
    amount,
    date,
  };
}

async function readResponse(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
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

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8C7547]">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-serif text-2xl tracking-tight text-[#14243D] sm:text-[28px]">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-xs leading-5 text-[#777A80]">
          {description}
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#777A80]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2F0EA] text-[#8C7547]">
          {icon}
        </span>
      </div>
      <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-[#14243D]">
        {value}
      </p>
    </Card>
  );
}

export default function PayatsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [entries, setEntries] = useState<PersonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<ViewMode>("choose");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadPayats = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const peopleResponse = await apiFetch("/api/people/");
      const peopleData = await readResponse(peopleResponse);

      if (!peopleResponse.ok) {
        throw new Error(
          errorOf(peopleData, "Unable to load your People records."),
        );
      }

      const rawPeople = listOf(peopleData);

      if (!rawPeople) {
        throw new Error(
          "The People API did not return a list. Check GET /api/people/.",
        );
      }

      const normalizedPeople = rawPeople
        .map(normalizePerson)
        .filter((person): person is Person => person !== null);

      setPeople(normalizedPeople);

      if (normalizedPeople.length === 0) {
        setEntries([]);
        setNotice("No people were found for your account yet.");
        return;
      }

      const results = await Promise.all(
        normalizedPeople.map(async (person) => {
          try {
            const response = await apiFetch(
              `/api/people/${person.id}/payat-entries/`,
            );
            const data = await readResponse(response);

            if (!response.ok) {
              return {
                person,
                entries: [] as PersonEntry[],
                error: errorOf(
                  data,
                  `Could not load entries for ${person.name}.`,
                ),
              };
            }

            const rawEntries = listOf(data);

            if (!rawEntries) {
              return {
                person,
                entries: [] as PersonEntry[],
                error: `The entries API returned an unexpected response for ${person.name}.`,
              };
            }

            return {
              person,
              entries: rawEntries
                .map((entry) => normalizeEntry(entry, person))
                .filter((entry): entry is PersonEntry => entry !== null),
              error: "",
            };
          } catch {
            return {
              person,
              entries: [] as PersonEntry[],
              error: `Could not load entries for ${person.name}.`,
            };
          }
        }),
      );

      const allEntries = results.flatMap((result) => result.entries);
      setEntries(allEntries);

      const failed = results.filter((result) => result.error);

      if (failed.length > 0) {
        setNotice(
          `${allEntries.length} entries loaded. ${failed.length} person record(s) could not be loaded. Refresh or check the API permissions.`,
        );
      } else if (allEntries.length === 0) {
        setNotice(
          "People loaded successfully, but no dated MY_PAYAT or IPPOL_PAYATTIYATH entries were returned.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load Payat entries.",
      );
      setPeople([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayats();
  }, [loadPayats]);

  const ownerGroups = useMemo(() => {
    const grouped = new Map<string, PersonEntry[]>();

    entries
      .filter((entry) => entry.entry_type === "MY_PAYAT")
      .forEach((entry) => {
        if (!grouped.has(entry.date)) grouped.set(entry.date, []);
        grouped.get(entry.date)!.push(entry);
      });

    return Array.from(grouped.entries())
      .map(([date, groupEntries]) => ({
        id: `owner-${date}`,
        date,
        entries: groupEntries.sort((a, b) =>
          a.personName.localeCompare(b.personName),
        ),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const memberGroups = useMemo(() => {
    const grouped = new Map<string, PersonEntry[]>();

    entries
      .filter((entry) => entry.entry_type === "IPPOL_PAYATTIYATH")
      .forEach((entry) => {
        if (!grouped.has(entry.date)) grouped.set(entry.date, []);
        grouped.get(entry.date)!.push(entry);
      });

    return Array.from(grouped.entries())
      .map(([date, groupEntries]) => ({
        id: `member-${date}`,
        date,
        entries: groupEntries.sort((a, b) =>
          a.personName.localeCompare(b.personName),
        ),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const displayedGroups =
    view === "owner" ? ownerGroups : memberGroups;

  const filteredGroups = displayedGroups.filter((group) =>
    `${group.date} ${formatDate(group.date)} ${group.entries
      .map((entry) => entry.personName)
      .join(" ")}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const activeEntryType =
    view === "owner"
      ? "MY_PAYAT"
      : view === "member"
        ? "IPPOL_PAYATTIYATH"
        : null;

  const activeEntries = activeEntryType
    ? entries.filter((entry) => entry.entry_type === activeEntryType)
    : [];

  const activeTotal = activeEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

  function openView(nextView: ViewMode) {
    setView(nextView);
    setSearch("");
    setExpandedId(null);
    setError("");
    setNotice("");
  }

  return (
    <main className="min-h-screen w-full min-w-0 bg-[#FAF9F6] px-4 py-6 text-[#14243D] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-7">
        {/* Page heading */}
        <header className="border-b border-[#DFDED8] pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14243D] text-white">
                <Wallet size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-[0.16em]">
                  PAYAT
                </p>
                <p className="mt-0.5 text-[10px] text-[#777A80]">
                  YOUR FINANCIAL COMMUNITY
                </p>
              </div>
            </div>

            {view !== "choose" && (
              <button
                type="button"
                onClick={() => openView("choose")}
                className="inline-flex items-center gap-2 rounded-lg border border-[#DFDED8] bg-white px-3.5 py-2.5 text-xs font-medium transition hover:border-[#14243D] hover:bg-[#F2F0EA]"
              >
                <ArrowLeft size={14} />
                Back to Payats
              </button>
            )}
          </div>

          <div className="mt-8">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8C7547]">
              <Sparkles size={13} />
              YOUR PAYAT COMMUNITY
            </p>

            <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              Payats<span className="text-[#8C7547]">.</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#777A80]">
              Explore your Payat dates, view the people connected to each
              record, and keep track of the amounts in one place.
            </p>
          </div>
        </header>

        {/* Feedback */}
        {notice && (
          <div className="flex items-start gap-3 rounded-xl border border-[#DFDED8] bg-white px-4 py-3 text-xs leading-5 text-[#14243D]">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#8C7547]" />
            <p className="flex-1">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notice"
              className="text-[#777A80] hover:text-[#14243D]"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
          >
            <CircleAlert size={17} className="mt-0.5 shrink-0" />
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

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[#DFDED8] bg-white">
            <LoaderCircle size={27} className="animate-spin text-[#14243D]" />
            <p className="mt-4 text-sm text-[#777A80]">
              Preparing your Payat records...
            </p>
          </div>
        ) : (
          <>
            {view === "choose" && (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <ViewCard
                    icon={<Wallet size={21} />}
                    eyebrow="YOUR RECORDS / 01"
                    title="My Payat"
                    description="View MY_PAYAT dates and the people recorded under each date."
                    count={ownerGroups.length}
                    onClick={() => openView("owner")}
                  />

                  <ViewCard
                    icon={<Users size={21} />}
                    eyebrow="YOUR RECORDS / 02"
                    title="Payattiyath"
                    description="Explore PAYATTIYATH dates and their recorded amounts."
                    count={memberGroups.length}
                    onClick={() => openView("member")}
                  />
                </div>

                <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F2F0EA] text-[#8C7547]">
                      <Users size={20} />
                    </span>
                    <div>
                      <p className="font-serif text-xl">Your community at a glance</p>
                      <p className="mt-1 text-xs leading-5 text-[#777A80]">
                        Review the people and dated entries linked to your account.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6 border-t border-[#DFDED8] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[#777A80]">
                        People
                      </p>
                      <p className="mt-1 text-xl font-semibold">{people.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[#777A80]">
                        Entries
                      </p>
                      <p className="mt-1 text-xl font-semibold">{entries.length}</p>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {view !== "choose" && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Stat
                    label="Total dates"
                    value={displayedGroups.length}
                    icon={<CalendarDays size={18} />}
                  />
                  <Stat
                    label="Total entries"
                    value={activeEntries.length}
                    icon={<Users size={18} />}
                  />
                  <Stat
                    label="Total amount"
                    value={money(activeTotal)}
                    icon={<IndianRupee size={18} />}
                  />
                </div>

                {/* Search and refresh */}
                <Card className="p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-[#DFDED8] bg-[#FAF9F6] px-3.5 py-3 transition focus-within:border-[#14243D] focus-within:ring-2 focus-within:ring-[#14243D]/10">
                      <Search size={17} className="shrink-0 text-[#777A80]" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by date or person..."
                        aria-label="Search Payat dates"
                        className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-[#96989C]"
                      />

                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          aria-label="Clear search"
                          className="text-[#777A80] hover:text-[#14243D]"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setExpandedId(null);
                        void loadPayats();
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#DFDED8] bg-white px-4 text-xs font-medium transition hover:border-[#14243D] hover:bg-[#F2F0EA]"
                    >
                      <RefreshCw size={15} />
                      Refresh records
                    </button>
                  </div>
                </Card>

                {/* Date list */}
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b border-[#DFDED8] px-5 py-5 sm:px-6">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8C7547]">
                        {view === "owner" ? "MY PAYAT" : "IPPOL PAYATTIYATH"}
                      </p>
                      <h2 className="mt-1.5 font-serif text-xl sm:text-2xl">
                        {view === "owner" ? "My Payat dates" : "Ippol Payattiyath dates"}
                      </h2>
                      <p className="mt-1 text-xs text-[#777A80]">
                        {filteredGroups.length}{" "}
                        {filteredGroups.length === 1 ? "date" : "dates"} found
                      </p>
                    </div>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F2F0EA] text-[#8C7547]">
                      <CalendarDays size={19} />
                    </span>
                  </div>

                  {filteredGroups.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2F0EA] text-[#8C7547]">
                        <CalendarDays size={22} />
                      </div>
                      <h3 className="mt-4 font-serif text-xl">
                        {search
                          ? "No matching dates"
                          : view === "owner"
                            ? "No My Payat dates yet"
                            : "No Ippol Payattiyath dates yet"}
                      </h3>
                      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#777A80]">
                        {search
                          ? "Try searching with another name or date."
                          : "No matching dated entries were returned for your people records."}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#DFDED8]">
                      {filteredGroups.map((group) => {
                        const expanded = expandedId === group.id;
                        const calendar = calendarParts(group.date);
                        const total = group.entries.reduce(
                          (sum, entry) => sum + entry.amount,
                          0,
                        );

                        return (
                          <div key={group.id}>
                            <button
                              type="button"
                              aria-expanded={expanded}
                              onClick={() =>
                                setExpandedId(expanded ? null : group.id)
                              }
                              className="group flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition hover:bg-[#FAF9F6] sm:gap-4 sm:px-6 sm:py-5"
                            >
                              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-[#DFDED8] bg-[#FAF9F6] text-[#14243D]">
                                <span className="font-serif text-xl leading-5">
                                  {calendar.day}
                                </span>
                                <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[#8C7547]">
                                  {calendar.month}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[#14243D]">
                                  {formatDate(group.date)}
                                </p>
                                <p className="mt-1 text-xs text-[#777A80]">
                                  {group.entries.length}{" "}
                                  {group.entries.length === 1 ? "entry" : "entries"}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-[#14243D]">
                                  {money(total)}
                                </p>
                                <p className="mt-1 text-[10px] text-[#8C7547]">
                                  {expanded ? "Hide details" : "View details"}
                                </p>
                              </div>

                              <ArrowRight
                                size={16}
                                className={`ml-1 shrink-0 text-[#96989C] transition ${
                                  expanded ? "rotate-90" : ""
                                }`}
                              />
                            </button>

                            {expanded && (
                              <div className="border-t border-[#DFDED8] bg-[#FAF9F6] px-4 py-5 sm:px-6">
                                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8C7547]">
                                      DATE DETAILS
                                    </p>
                                    <h3 className="mt-1 font-serif text-lg">
                                      {formatDate(group.date)}
                                    </h3>
                                  </div>
                                  <span className="rounded-md border border-[#DFDED8] bg-white px-3 py-2 text-[10px] text-[#777A80]">
                                    {group.entries.length}{" "}
                                    {group.entries.length === 1 ? "person" : "people"}
                                  </span>
                                </div>

                                <div className="overflow-hidden rounded-lg border border-[#DFDED8] bg-white">
                                  <div className="hidden grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-[#DFDED8] bg-[#F2F0EA] px-4 py-3 sm:grid">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#777A80]">
                                      Person
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#777A80]">
                                      Amount
                                    </span>
                                  </div>

                                  <div className="divide-y divide-[#DFDED8]">
                                    {group.entries.map((entry) => (
                                      <div
                                        key={`${entry.personId}-${entry.id}`}
                                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F2F0EA] text-[#8C7547]">
                                            <IndianRupee size={16} />
                                          </span>
                                          <div className="min-w-0">
                                            <p className="break-words text-sm font-medium text-[#14243D]">
                                              {entry.personName}
                                            </p>
                                            <p className="mt-1 text-[10px] text-[#777A80]">
                                              {view === "owner"
                                                ? "My Payat"
                                                : "Ippol Payattiyath"}
                                              {" · "}
                                              {formatDate(entry.date)}
                                            </p>
                                          </div>
                                        </div>

                                        <p className="shrink-0 text-sm font-semibold text-[#14243D]">
                                          {money(entry.amount)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex items-center justify-between gap-3 border-t border-[#DFDED8] bg-[#F2F0EA] px-4 py-4">
                                    <span className="text-xs font-semibold text-[#14243D]">
                                      Date total
                                    </span>
                                    <span className="text-sm font-semibold text-[#14243D]">
                                      {money(total)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            )}
          </>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DFDED8] pt-5 text-[10px] text-[#96989C]">
          <span>PAYAT © 2026</span>
          <span className="flex items-center gap-2">
            <Wallet size={13} />
            Your community, in one place.
          </span>
        </footer>
      </div>
    </main>
  );
}

function ViewCard({
  icon,
  eyebrow,
  title,
  description,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-[#DFDED8] bg-white p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#BFB39B] hover:shadow-[0_8px_25px_rgba(20,36,61,0.05)] sm:p-6"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#14243D] text-white">
          {icon}
        </span>
        <ArrowRight
          size={18}
          className="text-[#96989C] transition group-hover:translate-x-1 group-hover:text-[#14243D]"
        />
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8C7547]">
        {eyebrow}
      </p>

      <h2 className="mt-2 font-serif text-2xl tracking-tight text-[#14243D]">
        {title}
      </h2>

      <p className="mt-2 min-h-10 text-xs leading-5 text-[#777A80]">
        {description}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-[#DFDED8] pt-4">
        <span className="text-xs text-[#777A80]">Total dates</span>
        <span className="text-sm font-semibold text-[#14243D]">{count}</span>
      </div>
    </button>
  );
}
