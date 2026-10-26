
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  CreditCard,
  HandCoins,
  HeartHandshake,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type ActivityItem = {
  id: number;
  person_id: number;
  person_name: string;
  entry_type: "MY_PAYAT" | "IPPOL_PAYATTIYATH";
  entry_label: string;
  amount: string;
  date: string;
  created_at: string;
};

type DashboardSummary = {
  people_count: number;
  registered_users_count: number;
  to_give: string;
  to_receive: string;
  net_position: string;
  recent_activity: ActivityItem[];
};

const emptySummary: DashboardSummary = {
  people_count: 0,
  registered_users_count: 0,
  to_give: "0.00",
  to_receive: "0.00",
  net_position: "0.00",
  recent_activity: [],
};

function money(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-lg tracking-tight text-[#14243D]">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-[#777A80]">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-[#DFDED8] bg-white p-5 transition hover:border-[#C9C2B5]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-[#777A80]">{title}</p>

        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0EEE8] text-[#14243D]">
          <Icon size={18} strokeWidth={1.7} />
        </span>
      </div>

      <p className="mt-5 break-words text-2xl font-semibold tracking-tight text-[#14243D]">
        {value}
      </p>

      <p className="mt-2 text-[11px] leading-4 text-[#777A80]">
        {description}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] =
    useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/dashboard-summary/");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            `Could not load dashboard (HTTP ${response.status}).`
        );
      }

      setSummary({
        people_count: Number(data.people_count) || 0,
        registered_users_count:
          Number(data.registered_users_count) || 0,
        to_give: String(data.to_give ?? "0.00"),
        to_receive: String(data.to_receive ?? "0.00"),
        net_position: String(data.net_position ?? "0.00"),
        recent_activity: Array.isArray(data.recent_activity)
          ? data.recent_activity
          : [],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const filteredActivity = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return summary.recent_activity;

    return summary.recent_activity.filter((item) =>
      `${item.person_name} ${item.entry_label} ${item.amount} ${item.date}`
        .toLowerCase()
        .includes(query)
    );
  }, [search, summary.recent_activity]);

  return (
    <main className="min-h-screen min-w-0 bg-[#FAF9F6] text-[#14243D]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-[#DFDED8] bg-[#FAF9F6]/95 px-4 py-4 backdrop-blur sm:px-7 xl:px-9">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#14243D] text-white">
            <Wallet size={18} />
          </div>

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8C7547]">
              PAYAT / Workspace
            </p>
            <h1 className="mt-0.5 font-serif text-xl tracking-tight text-[#14243D]">
              Home overview
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-expanded={notificationsOpen}
            aria-label="Toggle notifications"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#DAD9D4] bg-white text-[#14243D] transition hover:bg-[#F0EEE8]"
          >
            <Bell size={17} strokeWidth={1.7} />
          </button>

          <Link
            href="/profile"
            className="hidden h-10 items-center gap-2 rounded-lg border border-[#DAD9D4] bg-white px-3 text-xs font-medium text-[#14243D] transition hover:bg-[#F0EEE8] sm:flex"
          >
            My account
            <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 xl:px-9">
        {/* Notifications */}
        {notificationsOpen && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#DFDED8] bg-white p-4">
            <Bell size={17} className="shrink-0 text-[#8C7547]" />
            <div>
              <p className="text-xs font-medium text-[#14243D]">
                Notifications
              </p>
              <p className="mt-1 text-xs text-[#777A80]">
                You have no new notifications yet.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
          >
            <span className="flex items-center gap-2">
              <CircleAlert size={16} />
              {error}
            </span>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Welcome */}
        <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DFDED8] bg-white px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8C7547]" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#777A80]">
                Your community finance
              </span>
            </div>

            <h2 className="font-serif text-3xl leading-tight tracking-tight text-[#14243D] sm:text-4xl">
              Community starts with trust.
            </h2>

            <p className="mt-3 max-w-2xl text-xs leading-6 text-[#777A80] sm:text-sm">
              See the people in your community and the money you
              still need to give or receive.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/people"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DAD9D4] bg-white px-3.5 text-xs font-medium text-[#14243D] transition hover:bg-[#F0EEE8]"
            >
              <Users size={15} />
              Add a person
            </Link>

            <Link
              href="/payats"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#14243D] px-3.5 text-xs font-medium text-white transition hover:bg-[#203958]"
            >
              <Plus size={15} />
              Manage Payats
            </Link>
          </div>
        </section>

        {/* Statistics */}
        <section className="mb-8">
          <SectionTitle
            title="At a glance"
            description="Live totals from your saved records"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="People added"
              value={loading ? "…" : String(summary.people_count)}
              description="People in your list"
              icon={Users}
            />

            <StatCard
              title="Registered users"
              value={
                loading ? "…" : String(summary.registered_users_count)
              }
              description="Active, non-blocked user accounts"
              icon={ShieldCheck}
            />

            <StatCard
              title="Bakki Kittan"
              value={loading ? "…" : money(summary.to_receive)}
              description="Outstanding money to receive"
              icon={ArrowDownLeft}
            />

            <StatCard
              title="Total Kodukkan"
              value={loading ? "…" : money(summary.to_give)}
              description="Outstanding money to give"
              icon={ArrowUpRight}
            />
          </div>

          {loading && (
            <p className="mt-3 flex items-center gap-2 text-[11px] text-[#777A80]">
              <LoaderCircle size={13} className="animate-spin" />
              Loading your saved records…
            </p>
          )}
        </section>

        {/* Money summary */}
        <section className="mb-8 grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <div className="rounded-xl border border-[#DFDED8] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl text-[#14243D]">
                  Money summary
                </h3>
                <p className="mt-1 text-xs text-[#777A80]">
                  Totals across the people you added
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0EEE8] text-[#14243D]">
                <CreditCard size={19} strokeWidth={1.7} />
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#DFDED8] bg-[#FAF9F6] p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[#8C7547]">
                  <ArrowDownLeft size={16} />
                  Bakki Kittan
                </div>

                <p className="mt-4 break-words text-2xl font-semibold tracking-tight text-[#14243D]">
                  {loading ? "…" : money(summary.to_receive)}
                </p>

                <p className="mt-2 text-[10px] leading-4 text-[#777A80]">
                  Money still owed to you
                </p>
              </div>

              <div className="rounded-lg border border-[#DFDED8] bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[#14243D]">
                  <ArrowUpRight size={16} />
                  Total Kodukkan
                </div>

                <p className="mt-4 break-words text-2xl font-semibold tracking-tight text-[#14243D]">
                  {loading ? "…" : money(summary.to_give)}
                </p>

                <p className="mt-2 text-[10px] leading-4 text-[#777A80]">
                  Money you still need to give
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#DFDED8] p-4">
              <div>
                <p className="text-[11px] text-[#777A80]">
                  Net position
                </p>
                <p className="mt-1 text-xl font-semibold text-[#14243D]">
                  {loading ? "…" : money(summary.net_position)}
                </p>
              </div>

              <Link
                href="/people"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8C7547] hover:text-[#14243D]"
              >
                Review people
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Workspace */}
          <div className="flex flex-col rounded-xl bg-[#14243D] p-5 text-white sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-white/65">
                  Your workspace
                </p>
                <h3 className="mt-2 font-serif text-2xl leading-tight">
                  Keep every record clear.
                </h3>
              </div>

              <HandCoins
                size={25}
                strokeWidth={1.5}
                className="shrink-0 text-[#D6C49F]"
              />
            </div>

            <p className="mt-4 text-xs leading-6 text-white/70">
              Your totals update from the saved entries attached to
              the people you manage. Add or update a record to keep
              the summary current.
            </p>

            <div className="mt-auto pt-6">
              <Link
                href="/payats"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 text-xs font-medium text-white transition hover:bg-white/10"
              >
                Open Payats
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-4 text-[10px] text-white/60">
              <ShieldCheck size={14} />
              Private to your account
            </div>
          </div>
        </section>

        {/* Recent activity */}
        <section className="mb-8 rounded-xl border border-[#DFDED8] bg-white p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <SectionTitle
              title="Recent transaction activity"
              description="Latest saved entries for your people"
            />

            <Link
              href="/people"
              className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C7547] hover:text-[#14243D]"
            >
              Manage entries
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96989C]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search person or entry type..."
              aria-label="Search recent activity"
              className="h-11 w-full rounded-lg border border-[#DAD9D4] bg-[#FAF9F6] pl-9 pr-3 text-xs text-[#14243D] outline-none transition placeholder:text-[#96989C] focus:border-[#14243D] focus:ring-2 focus:ring-[#14243D]/10 sm:max-w-sm"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-[#777A80]">
              <LoaderCircle size={15} className="animate-spin" />
              Loading activity…
            </div>
          ) : filteredActivity.length ? (
            <div className="divide-y divide-[#EFEEE9]">
              {filteredActivity.map((item) => {
                const incoming = item.entry_type === "MY_PAYAT";

                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 py-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F0EEE8] text-[#14243D]">
                      {incoming ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#14243D]">
                        {item.person_name}
                      </p>
                      <p className="mt-1 text-[10px] text-[#777A80]">
                        {item.entry_label} · {dateLabel(item.date)}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-[#14243D]">
                      {money(item.amount)}
                    </p>

                    <Link
                      href="/people"
                      aria-label={`View ${item.person_name}`}
                      className="rounded-lg p-2 text-[#777A80] transition hover:bg-[#F0EEE8] hover:text-[#14243D]"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#DAD9D4] px-4 py-10 text-center">
              <Activity
                size={23}
                strokeWidth={1.5}
                className="mx-auto text-[#8C7547]"
              />

              <p className="mt-3 text-xs font-semibold text-[#14243D]">
                {search
                  ? "No matching activity"
                  : "No transaction entries yet"}
              </p>

              <p className="mt-2 text-[11px] leading-5 text-[#777A80]">
                {search
                  ? "Try a different search term."
                  : "Add entries from a person's page and they will appear here."}
              </p>

              <Link
                href="/people"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#8C7547] hover:text-[#14243D]"
              >
                Open People
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </section>

        {/* Community message */}
        <section className="mb-6 flex flex-col gap-4 rounded-xl border border-[#DFDED8] bg-white p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F0EEE8] text-[#14243D]">
            <HeartHandshake size={22} strokeWidth={1.5} />
          </span>

          <div className="flex-1">
            <h3 className="font-serif text-lg text-[#14243D]">
              Support without interest. Built on trust.
            </h3>
            <p className="mt-1 text-[11px] leading-5 text-[#777A80]">
              Keep your community commitments clear and your records
              organised.
            </p>
          </div>

          <Link
            href="/people"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#DAD9D4] px-4 text-xs font-medium text-[#14243D] transition hover:bg-[#F0EEE8]"
          >
            Manage people
            <ArrowRight size={14} />
          </Link>
        </section>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DFDED8] py-5 text-[10px] text-[#96989C]">
          <span>© 2026 Payat. All rights reserved.</span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={12} />
            Your saved records
          </span>
        </footer>
      </div>
    </main>
  );
}
