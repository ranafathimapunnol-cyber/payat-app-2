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

function normalizeEntry(
  value: unknown,
  person: Person,
): PersonEntry | null {
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

  const displayedGroups: DateGroup[] =
    view === "owner" ? ownerGroups : memberGroups;

  const filteredGroups = displayedGroups.filter((group) =>
    `${group.date} ${formatDate(group.date)} ${group.entries
      .map((entry) => entry.personName)
      .join(" ")}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const activeEntryType: EntryType | null =
    view === "owner"
      ? "MY_PAYAT"
      : view === "member"
        ? "IPPOL_PAYATTIYATH"
        : null;

  const activeEntryCount = activeEntryType
    ? entries.filter((entry) => entry.entry_type === activeEntryType).length
    : 0;

  const activeTotal = activeEntryType
    ? entries
        .filter((entry) => entry.entry_type === activeEntryType)
        .reduce((sum, entry) => sum + entry.amount, 0)
    : 0;

  function openView(nextView: ViewMode) {
    setView(nextView);
    setSearch("");
    setExpandedId(null);
    setError("");
    setNotice("");
  }

  return (
    <main className="w-full min-w-0 px-4 py-5 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-6">
        <header>
          <p className="text-sm text-slate-500">
            Your community, in one place
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#172b4d] sm:text-3xl">
              Payats
            </h1>

            {view !== "choose" && (
              <button
                type="button"
                onClick={() => openView("choose")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#172b4d] hover:bg-slate-100"
              >
                <ArrowLeft size={17} /> Back
              </button>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {view === "choose"
              ? "Choose how you want to view your Payat dates."
              : view === "owner"
                ? "Your MY_PAYAT dates and the people recorded under each date."
                : "Your IPPOL_PAYATTIYATH dates and recorded payments."}
          </p>
        </header>

        {notice && (
          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-[#172b4d]">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notice"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
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
          <div className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            <LoaderCircle size={21} className="animate-spin text-[#172b4d]" />
            Loading your Payat entries...
          </div>
        ) : (
          <>
            {view === "choose" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ViewCard
                  icon={<Wallet size={22} />}
                  title="My Payat"
                  description="View MY_PAYAT dates and the people listed under each date."
                  count={ownerGroups.length}
                  onClick={() => openView("owner")}
                />

                <ViewCard
                  icon={<Users size={22} />}
                  title="Ippol Payattiyath"
                  description="View IPPOL_PAYATTIYATH dates and their recorded amounts."
                  count={memberGroups.length}
                  onClick={() => openView("member")}
                />
              </div>
            )}

            {view !== "choose" && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Stat label="Total dates" value={displayedGroups.length} />
                  <Stat label="Entries" value={activeEntryCount} />
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <p className="text-sm text-slate-500">Total amount</p>
                    <p className="mt-2 text-2xl font-bold text-[#172b4d]">
                      {money(activeTotal)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 focus-within:border-[#172b4d]">
                    <Search size={18} className="shrink-0 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by date or person"
                      aria-label="Search Payat dates"
                      className="w-full min-w-0 bg-transparent text-sm outline-none"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setExpandedId(null);
                      void loadPayats();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#172b4d] hover:bg-slate-100"
                  >
                    <RefreshCw size={17} /> Refresh
                  </button>
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
                    <div>
                      <h2 className="font-semibold text-[#172b4d]">
                        {view === "owner"
                          ? "My Payat dates"
                          : "Ippol Payattiyath dates"}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {filteredGroups.length}{" "}
                        {filteredGroups.length === 1 ? "date" : "dates"}
                      </p>
                    </div>
                    <CalendarDays size={20} className="text-[#172b4d]" />
                  </div>

                  {filteredGroups.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <CalendarDays
                        size={26}
                        className="mx-auto text-slate-400"
                      />
                      <h3 className="mt-3 font-semibold text-[#172b4d]">
                        {search
                          ? "No matching dates"
                          : view === "owner"
                            ? "No My Payat dates found"
                            : "No Ippol Payattiyath dates found"}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {search
                          ? "Try another search."
                          : "No matching dated entries were returned for your people records."}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
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
                              className="group flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:gap-4 sm:px-5"
                            >
                              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#eef2f8] text-[#172b4d]">
                                <span className="text-lg font-bold leading-5">
                                  {calendar.day}
                                </span>
                                <span className="mt-1 text-[10px] font-semibold uppercase">
                                  {calendar.month}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {formatDate(group.date)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {group.entries.length}{" "}
                                  {group.entries.length === 1
                                    ? "entry"
                                    : "entries"}{" "}
                                  · {money(total)}
                                </p>
                              </div>

                              <ArrowRight
                                size={18}
                                className={`shrink-0 text-slate-400 transition ${
                                  expanded ? "rotate-90" : ""
                                }`}
                              />
                            </button>

                            {expanded && (
                              <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
                                <h3 className="text-sm font-semibold text-[#172b4d]">
                                  {view === "owner"
                                    ? "People recorded under My Payat"
                                    : "People recorded under Ippol Payattiyath"}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                  Date: {formatDate(group.date)}
                                </p>

                                <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                  {group.entries.map((entry) => (
                                    <div
                                      key={`${entry.personId}-${entry.id}`}
                                      className="flex flex-wrap items-center justify-between gap-3 px-3 py-4 sm:px-4"
                                    >
                                      <div className="flex min-w-0 items-start gap-3">
                                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef2f8] text-[#172b4d]">
                                          <IndianRupee size={17} />
                                        </span>

                                        <div className="min-w-0">
                                          <p className="break-words text-sm font-semibold text-slate-800">
                                            {entry.personName}
                                          </p>
                                          <p className="mt-1 text-xs text-slate-500">
                                            {view === "owner"
                                              ? "My Payat"
                                              : "Ippol Payattiyath"}{" "}
                                            · {formatDate(entry.date)}
                                          </p>
                                        </div>
                                      </div>

                                      <p className="shrink-0 text-base font-bold text-[#172b4d]">
                                        {money(entry.amount)}
                                      </p>
                                    </div>
                                  ))}

                                  <div className="flex items-center justify-between bg-[#eef2f8] px-4 py-3">
                                    <span className="text-sm font-semibold text-[#172b4d]">
                                      Total
                                    </span>
                                    <span className="text-base font-bold text-[#172b4d]">
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
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ViewCard({
  icon,
  title,
  description,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#b8c7dc] hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2f8] text-[#172b4d]">
          {icon}
        </span>
        <ArrowRight
          size={19}
          className="text-slate-400 transition group-hover:translate-x-1"
        />
      </div>

      <h2 className="mt-4 font-semibold text-[#172b4d]">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-5 flex justify-between border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-500">Total dates</span>
        <span className="font-bold text-[#172b4d]">{count}</span>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#172b4d]">{value}</p>
    </div>
  );
}
