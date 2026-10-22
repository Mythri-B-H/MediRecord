import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-4xl font-bold text-slate-800 mb-3">MediRecord</h1>
      <p className="text-slate-800 max-w-md mb-8">
        Intelligent Clinical Records &amp; Symptom-Similarity Search System for
        small and mid-sized clinics.
      </p>
      <Link
        href="/login"
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition"
      >
        Sign in
      </Link>
    </main>
  );
}
