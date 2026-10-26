
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, SVGProps } from "react";
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
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type IconType = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: number;
    strokeWidth?: number;
  }
>;

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
      <h2 className="text-[15px] font-semibold tracking-tight text-[#15223b]">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
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
  icon: IconType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{title}</p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2fa] text-[#203a64]">
          <Icon size={18} />
        </span>
      </div>

      <p className="mt-5 text-2xl font-semibold tracking-tight text-[#14213a]">
        {value}
      </p>

      <p className="mt-2 text-[11px] text-slate-500">{description}</p>
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

    if (!query) {
      return summary.recent_activity;
    }

    return summary.recent_activity.filter((item) =>
      `${item.person_name} ${item.entry_label} ${item.amount} ${item.date}`
        .toLowerCase()
        .includes(query)
    );
  }, [search, summary.recent_activity]);

  return (
    // The shared DashboardShell already renders the sidebar.
    <div className="min-h-screen min-w-0 bg-[#f5f7fb] text-[#172033]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-7 xl:px-9">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            PAYAT / Workspace
          </p>

          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[#14213a]">
            Home overview
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen((open) => !open)
            }
            aria-expanded={notificationsOpen}
            aria-label="Toggle notifications"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <Bell size={17} />
          </button>

          <Link
            href="/profile"
            className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:flex"
          >
            My account
            <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 xl:px-9">
        {/* Notifications */}
        {notificationsOpen && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
            You have no new notifications yet.
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

        {/* Welcome section */}
        <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-600">
                Your community finance
              </span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-[#14213a] sm:text-3xl">
              Community starts with trust.
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500 sm:text-sm">
              See the people in your community and the money you
              still need to give or receive.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/people"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Users size={15} />
              Add a person
            </Link>

            <Link
              href="/payats"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#14284b] px-3.5 text-xs font-semibold text-white hover:bg-[#203a64]"
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
              value={
                loading ? "…" : String(summary.people_count)
              }
              description="People in your list"
              icon={Users}
            />

            <StatCard
              title="Registered Users"
              value={
                loading
                  ? "…"
                  : String(summary.registered_users_count)
              }
              description="Active, non-blocked user accounts"
              icon={Users}
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
            <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <LoaderCircle size={13} className="animate-spin" />
              Loading your saved records…
            </p>
          )}
        </section>

        {/* Money summary and workspace card */}
        <section className="mb-8 grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#14213a]">
                  Money summary
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Totals across the people you added
                </p>
              </div>

              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2fa] text-[#203a64]">
                <CreditCard size={18} />
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#dce9df] bg-[#f5faf6] p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[#326348]">
                  <ArrowDownLeft size={16} />
                  Bakki Kittan
                </div>

                <p className="mt-4 break-words text-2xl font-semibold tracking-tight text-[#1e5238]">
                  {loading ? "…" : money(summary.to_receive)}
                </p>

                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                  Money still owed to you
                </p>
              </div>

              <div className="rounded-xl border border-[#e8e1d6] bg-[#fbf8f3] p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[#80613b]">
                  <ArrowUpRight size={16} />
                  Total Kodukkan
                </div>

                <p className="mt-4 break-words text-2xl font-semibold tracking-tight text-[#674a2d]">
                  {loading ? "…" : money(summary.to_give)}
                </p>

                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                  Money you still need to give
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f5f7fb] p-4">
              <div>
                <p className="text-[11px] text-slate-500">
                  Net position
                </p>

                <p className="mt-1 text-lg font-semibold text-[#14213a]">
                  {loading ? "…" : money(summary.net_position)}
                </p>
              </div>

              <Link
                href="/people"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#203a64] hover:underline"
              >
                Review people
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl bg-[#14284b] p-5 text-white sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-300">
                  Your workspace
                </p>

                <h3 className="mt-1 text-base font-semibold">
                  Keep every record clear
                </h3>
              </div>

              <HandCoins size={22} className="text-[#e5dbc4]" />
            </div>

            <p className="mt-4 text-xs leading-6 text-slate-300">
              Your totals update from the saved entries attached to
              the people you manage. Add or update a record to keep
              the summary current.
            </p>

            <div className="mt-auto pt-6">
              <Link
                href="/payats"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] text-xs font-semibold hover:bg-white/[0.13]"
              >
                Open Payats
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-2 text-[10px] text-slate-400">
              <ShieldCheck size={14} />
              Private to your account
            </div>
          </div>
        </section>

        {/* Recent activity */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <SectionTitle
                title="Recent transaction activity"
                description="Latest saved entries for your people"
              />
            </div>

            <Link
              href="/people"
              className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#203a64] hover:underline"
            >
              Manage entries
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="relative mb-3">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search person or entry type…"
              aria-label="Search recent activity"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-slate-400 sm:max-w-sm"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
              <LoaderCircle size={15} className="animate-spin" />
              Loading activity…
            </div>
          ) : filteredActivity.length ? (
            <div className="divide-y divide-slate-100">
              {filteredActivity.map((item) => {
                const incoming = item.entry_type === "MY_PAYAT";

                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 py-4"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        incoming
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {incoming ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {item.person_name}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">
                        {item.entry_label} · {dateLabel(item.date)}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-[#172033]">
                      {money(item.amount)}
                    </p>

                    <Link
                      href="/people"
                      aria-label={`View ${item.person_name}`}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
              <Activity
                size={22}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 text-xs font-semibold text-slate-700">
                {search
                  ? "No matching activity"
                  : "No transaction entries yet"}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                {search
                  ? "Try a different search term."
                  : "Add entries from a person's page and they will appear here."}
              </p>

              <Link
                href="/people"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#203a64] hover:underline"
              >
                Open People
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </section>

        {/* Community message */}
        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf2fa] text-[#203a64]">
            <HeartHandshake size={22} />
          </span>

          <div className="flex-1">
            <h3 className="text-xs font-semibold text-[#14213a]">
              Support without interest. Built on trust.
            </h3>

            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              Keep your community commitments clear and your records
              organised.
            </p>
          </div>

          <Link
            href="/people"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Manage people
            <ArrowRight size={14} />
          </Link>
        </section>

        {/* Static year avoids the prerender current-time warning */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-5 text-[10px] text-slate-400">
          <span>© 2026 PAYAT · Community first</span>

          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={12} />
            Your saved records
          </span>
        </footer>
      </div>
    </div>
  );
}
