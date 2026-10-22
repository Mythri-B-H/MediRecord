"use client";

import { useRouter } from "next/navigation";

export default function DashboardShell({ title, roleLabel, children }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">MediRecord</h1>
          <p className="text-xs text-slate-800">{roleLabel} dashboard</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-800 hover:text-red-600 border border-slate-300 hover:border-red-300 rounded-lg px-3 py-1.5 transition"
        >
          Log out
        </button>
      </header>
      <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">
        <h2 className="text-xl font-semibold text-slate-800 mb-6">{title}</h2>
        {children}
      </main>
    </div>
  );
}
