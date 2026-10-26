
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Wallet,
  Home,
  Users,
  UserRound,
  ShieldCheck,
  ChevronRight,
  LogOut,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

const navigation = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "People", href: "/people", icon: Users },
  { label: "Payats", href: "/payats", icon: Wallet },
  { label: "My Profile", href: "/profile", icon: UserRound },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await apiFetch("/api/auth/logout/", {
        method: "POST",
      });

      if (!response.ok && response.status !== 401) {
        throw new Error("Unable to sign out.");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[265px] flex-col border-r border-[#DFDED8] bg-[#FAF9F6] px-5 py-7 md:flex">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="mb-12 flex items-center gap-3 px-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14243D] text-white">
            <Wallet size={21} strokeWidth={1.8} />
          </div>

          <div>
            <p className="font-serif text-[22px] tracking-tight text-[#14243D]">
              PAYAT
            </p>
            <p className="text-[9px] font-medium tracking-[0.15em] text-[#8C7547]">
              MONEY MANAGEMENT
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#96989C]">
          Workspace
        </p>

        <nav className="space-y-1.5">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-lg border px-4 py-3 text-[13px] transition ${
                  active
                    ? "border-[#DFDED8] bg-white font-semibold text-[#14243D]"
                    : "border-transparent font-medium text-[#777A80] hover:border-[#DFDED8] hover:bg-white hover:text-[#14243D]"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.7}
                  className={
                    active
                      ? "text-[#8C7547]"
                      : "text-[#777A80] group-hover:text-[#14243D]"
                  }
                />

                <span>{label}</span>

                {active && (
                  <ChevronRight
                    size={15}
                    className="ml-auto text-[#8C7547]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Account security card */}
        <div className="mt-auto rounded-xl border border-[#DFDED8] bg-white p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0EEE8] text-[#14243D]">
            <ShieldCheck size={19} strokeWidth={1.7} />
          </div>

          <p className="text-xs font-semibold text-[#14243D]">
            Your account, protected
          </p>

          <p className="mt-1.5 text-[11px] leading-5 text-[#777A80]">
            Keep your community support organised in one place.
          </p>

          <div className="mt-3 border-t border-[#EFEEE9] pt-3">
            <p className="text-[10px] leading-4 text-[#8C7547]">
              Secure. Simple. Community first.
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-4 flex w-full items-center gap-3 rounded-lg border border-transparent px-4 py-3 text-left text-[13px] font-medium text-[#777A80] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loggingOut ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <LogOut size={18} strokeWidth={1.7} />
          )}

          {loggingOut ? "Signing out..." : "Sign out"}
        </button>

        <p className="mt-4 px-2 text-[10px] text-[#96989C]">
          © 2026 Payat. All rights reserved.
        </p>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#DFDED8] bg-[#FAF9F6]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] transition ${
                active
                  ? "font-semibold text-[#14243D]"
                  : "text-[#777A80] hover:text-[#14243D]"
              }`}
            >
              {active && (
                <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-[#8C7547]" />
              )}

              <Icon
                size={19}
                strokeWidth={active ? 2 : 1.6}
              />

              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
