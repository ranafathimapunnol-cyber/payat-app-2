
"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { Suspense } from "react";

export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f7fc] text-[#172b4d]">
      <Suspense fallback={<div className="w-[245px] shrink-0" />}>
  <Sidebar />
</Suspense>
      

      <main className="min-h-screen min-w-0 pb-20 md:ml-[265px] md:pb-0">
        {children}
      </main>
    </div>
  );
}
