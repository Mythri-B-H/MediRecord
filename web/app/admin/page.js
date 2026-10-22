"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Card({ children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      {children}
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState("analytics");

  return (
    <DashboardShell title="Admin" roleLabel="Admin">
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          ["analytics", "Analytics"],
          ["doctors", "Manage Doctors"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-800 hover:text-blue-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "analytics" && <Analytics />}
      {tab === "doctors" && <ManageDoctors />}
    </DashboardShell>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <p className="text-xs text-slate-800 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <Card><p className="text-slate-700 text-sm">Loading…</p></Card>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total patients" value={data.totals?.total_patients ?? "—"} />
        <StatCard label="Total appointments" value={data.totals?.total_appointments ?? "—"} />
        <StatCard label="Total doctors" value={data.totals?.total_doctors ?? "—"} />
      </div>

      <Card>
        <h3 className="font-medium text-slate-800 mb-4">Revenue per doctor</h3>
        <p className="text-xs text-slate-700 mb-4">
          Pulled from the <code>doctor_revenue_summary</code> SQL view.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-800 border-b border-slate-200">
              <th className="py-2 pr-4">Doctor</th>
              <th className="py-2 pr-4">Appointments</th>
              <th className="py-2 pr-4">Unique patients</th>
              <th className="py-2 pr-4">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.revenue?.map((d) => (
              <tr key={d.doctor_id} className="border-b border-slate-100">
                <td className="py-2 pr-4">Dr. {d.doctor_name}</td>
                <td className="py-2 pr-4">{d.total_appointments}</td>
                <td className="py-2 pr-4">{d.unique_patients}</td>
                <td className="py-2 pr-4">₹{d.total_revenue}</td>
              </tr>
            ))}
            {data.revenue?.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-700">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialization: "",
    license_no: "",
    years_experience: "",
  });
  const [status, setStatus] = useState(null);

  async function load() {
    const res = await fetch("/api/doctors");
    const data = await res.json();
    setDoctors(data.doctors || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus({ ok: true, message: "Doctor account created" });
      setForm({ name: "", email: "", password: "", specialization: "", license_no: "", years_experience: "" });
      load();
    } else {
      setStatus({ ok: false, message: data.error || "Failed to create doctor" });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <h3 className="font-medium text-slate-800 mb-4">Add a doctor</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            className={inputCls}
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="email"
            className={inputCls}
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            className={inputCls}
            placeholder="Temporary password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input
            required
            className={inputCls}
            placeholder="Specialization"
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
          />
          <input
            required
            className={inputCls}
            placeholder="License number"
            value={form.license_no}
            onChange={(e) => setForm({ ...form, license_no: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Years of experience"
            value={form.years_experience}
            onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            Create doctor account
          </button>
          {status && (
            <p className={status.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
              {status.message}
            </p>
          )}
        </form>
      </Card>

      <Card>
        <h3 className="font-medium text-slate-800 mb-4">Current doctors</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-800 border-b border-slate-200">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Specialization</th>
              <th className="py-2 pr-4">Experience</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.doctor_id} className="border-b border-slate-100">
                <td className="py-2 pr-4">Dr. {d.name}</td>
                <td className="py-2 pr-4">{d.specialization}</td>
                <td className="py-2 pr-4">{d.years_experience} yrs</td>
              </tr>
            ))}
            {doctors.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate-700">
                  No doctors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
