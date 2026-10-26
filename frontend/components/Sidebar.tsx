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

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[265px] flex-col border-r border-[#e6ebf3] bg-white px-5 py-7 md:flex">
        <Link href="/dashboard" className="mb-12 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173b73] text-white shadow-sm">
            <Wallet size={21} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[19px] font-bold tracking-tight text-[#173b73]">
              PAYAT
            </p>
            <p className="text-[10px] font-medium tracking-[0.16em] text-[#8795aa]">
              MONEY MANAGEMENT
            </p>
          </div>
        </Link>

        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#98a4b6]">
          Workspace
        </p>

        <nav className="space-y-2">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] transition ${
                  active
                    ? "bg-[#eaf1ff] font-semibold text-[#173b73]"
                    : "font-medium text-[#66758c] hover:bg-[#f3f6fb] hover:text-[#173b73]"
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
                {active && (
                  <ChevronRight size={15} className="ml-auto opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-[#e7edf7] bg-[#f7f9fd] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#2865c7] shadow-sm">
            <ShieldCheck size={19} />
          </div>
          <p className="text-[12px] font-semibold text-[#203b65]">
            Your account, protected
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[#8290a5]">
            Keep your community support organised in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] font-medium text-[#7b879a] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
        >
          {loggingOut ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <LogOut size={18} />
          )}
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>

        <p className="mt-4 px-2 text-[10px] text-[#98a4b6]">
          PAYAT · Community first
        </p>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#e6ebf3] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {navigation.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] ${
                active
                  ? "font-semibold text-[#173b73]"
                  : "text-[#8795aa]"
              }`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}