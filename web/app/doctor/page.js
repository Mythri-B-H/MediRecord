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

export default function DoctorPage() {
  const [tab, setTab] = useState("appointments");

  return (
    <DashboardShell title="Doctor" roleLabel="Doctor">
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          ["appointments", "My Appointments"],
          ["search", "Symptom Search"],
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

      {tab === "appointments" && <Appointments />}
      {tab === "search" && <SymptomSearch />}
    </DashboardShell>
  );
}

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [activeId, setActiveId] = useState(null);

  async function load() {
    const res = await fetch("/api/appointments");
    const data = await res.json();
    setAppointments(data.appointments || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  const active = appointments.find((a) => a.appointment_id === activeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-800 border-b border-slate-200">
                <th className="py-2 pr-2">Patient</th>
                <th className="py-2 pr-2">When</th>
                <th className="py-2 pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr
                  key={a.appointment_id}
                  onClick={() => setActiveId(a.appointment_id)}
                  className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                    activeId === a.appointment_id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="py-2 pr-2">{a.patient_name}</td>
                  <td className="py-2 pr-2 text-slate-800">
                    {new Date(a.scheduled_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : a.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-700">
                    No appointments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="lg:col-span-3">
        {active ? (
          active.status === "completed" ? (
            <VisitDetails key={active.appointment_id} appointment={active} />
          ) : (
            <VisitForm key={active.appointment_id} appointment={active} onSaved={load} />
          )
        ) : (
          <Card>
            <p className="text-slate-700 text-sm">
              Select an appointment on the left to record a visit.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-700">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

function VisitDetails({ appointment }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/visits?appointment_id=${appointment.appointment_id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Could not load visit details"));
  }, [appointment.appointment_id]);

  const header = (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-medium text-slate-900">{appointment.patient_name}</h3>
        <p className="text-xs text-slate-700">{new Date(appointment.scheduled_at).toLocaleString()}</p>
      </div>
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        completed
      </span>
    </div>
  );

  if (error) return <Card>{header}<p className="text-sm text-red-600">{error}</p></Card>;
  if (!data) return <Card>{header}<p className="text-sm text-slate-700">Loading visit…</p></Card>;
  if (!data.visit)
    return <Card>{header}<p className="text-sm text-slate-700">No visit record found for this appointment.</p></Card>;

  const { visit, notes, notes_error, prescription_items, bill } = data;

  return (
    <Card>
      {header}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Field label="Blood pressure" value={visit.vitals_bp} />
        <Field label="Temperature" value={visit.vitals_temp != null ? `${visit.vitals_temp} °F` : null} />
        <Field label="Pulse" value={visit.vitals_pulse != null ? `${visit.vitals_pulse} bpm` : null} />
        <Field label="Diagnosis code" value={visit.diagnosis_code} />
      </div>

      <div className="border-t border-slate-200 pt-4 mb-5">
        <p className="text-xs font-medium text-slate-700 mb-2">
          Clinical notes <span className="font-normal">(MongoDB)</span>
        </p>
        {notes_error && <p className="text-sm text-red-600">{notes_error}</p>}
        {notes && (
          <>
            <p className="text-sm text-slate-900 mb-3">{notes.notes || "—"}</p>
            <div className="flex flex-wrap gap-1">
              {notes.symptoms?.map((s) => (
                <span key={s} className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </>
        )}
        {!notes && !notes_error && <p className="text-sm text-slate-700">No clinical note saved.</p>}
      </div>

      <div className="border-t border-slate-200 pt-4 mb-5">
        <p className="text-xs font-medium text-slate-700 mb-2">Prescription</p>
        {prescription_items.length === 0 ? (
          <p className="text-sm text-slate-700">No medicines prescribed.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-700 border-b border-slate-200">
                <th className="py-1.5 pr-3">Medicine</th>
                <th className="py-1.5 pr-3">Dosage</th>
                <th className="py-1.5 pr-3">Frequency</th>
                <th className="py-1.5 pr-3">Days</th>
              </tr>
            </thead>
            <tbody>
              {prescription_items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3">{it.medicine_name}</td>
                  <td className="py-1.5 pr-3">{it.dosage}</td>
                  <td className="py-1.5 pr-3">{it.frequency}</td>
                  <td className="py-1.5 pr-3">{it.duration_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs font-medium text-slate-700 mb-2">Bill</p>
        {bill ? (
          <p className="text-sm text-slate-900">
            Total <span className="font-medium">₹{bill.total_amount}</span> (consultation ₹
            {bill.consultation_fee} + medicines ₹{bill.medicine_total} + tax ₹{bill.tax}){" "}
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                bill.payment_status === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {bill.payment_status}
            </span>
          </p>
        ) : (
          <p className="text-sm text-slate-700">Not billed yet.</p>
        )}
      </div>
    </Card>
  );
}

function VisitForm({ appointment, onSaved }) {
  const [form, setForm] = useState({
    vitals_bp: "",
    vitals_temp: "",
    vitals_pulse: "",
    diagnosis_code: "",
    symptoms: "",
    notes: "",
  });
  const [status, setStatus] = useState(null);
  const [visitId, setVisitId] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [rxItems, setRxItems] = useState([{ medicine_id: "", dosage: "", frequency: "", duration_days: "" }]);

  useEffect(() => {
    fetch("/api/medicines").then((r) => r.json()).then((d) => setMedicines(d.medicines || []));
  }, []);

  async function handleSaveVisit(e) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: appointment.appointment_id,
        ...form,
        symptoms: form.symptoms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setVisitId(data.visit_id);
      setStatus({ ok: true, message: "Visit recorded (saved to MySQL + MongoDB)" });
      onSaved?.();
    } else {
      setStatus({ ok: false, message: data.error || "Failed to record visit" });
    }
  }

  async function handlePrescribe(e) {
    e.preventDefault();
    const res = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visit_id: visitId, items: rxItems }),
    });
    const data = await res.json();
    setStatus(
      res.ok
        ? { ok: true, message: `Prescription created (ID ${data.prescription_id})` }
        : { ok: false, message: data.error }
    );
  }

  return (
    <Card>
      <h3 className="font-medium text-slate-800 mb-1">{appointment.patient_name}</h3>
      <p className="text-xs text-slate-800 mb-4">
        {new Date(appointment.scheduled_at).toLocaleString()}
      </p>

      {!visitId ? (
        <form onSubmit={handleSaveVisit} className="grid grid-cols-2 gap-3">
          <input
            className={inputCls}
            placeholder="BP e.g. 120/80"
            value={form.vitals_bp}
            onChange={(e) => setForm({ ...form, vitals_bp: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Temp °F"
            value={form.vitals_temp}
            onChange={(e) => setForm({ ...form, vitals_temp: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Pulse"
            value={form.vitals_pulse}
            onChange={(e) => setForm({ ...form, vitals_pulse: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Diagnosis code e.g. J45"
            value={form.diagnosis_code}
            onChange={(e) => setForm({ ...form, diagnosis_code: e.target.value })}
          />
          <input
            className={`${inputCls} col-span-2`}
            placeholder="Symptoms, comma separated (e.g. chest tightness, wheezing)"
            value={form.symptoms}
            onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
          />
          <textarea
            className={`${inputCls} col-span-2`}
            rows={3}
            placeholder="Clinical notes (free text — stored in MongoDB)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="col-span-2 flex items-center gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              Save visit
            </button>
            {status && (
              <span className={status.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                {status.message}
              </span>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handlePrescribe} className="space-y-3">
          <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Visit #{visitId} saved. Add a prescription below.
          </p>
          {rxItems.map((item, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2">
              <select
                className={inputCls}
                value={item.medicine_id}
                onChange={(e) => {
                  const next = [...rxItems];
                  next[idx].medicine_id = e.target.value;
                  setRxItems(next);
                }}
              >
                <option value="">Medicine…</option>
                {medicines.map((m) => (
                  <option key={m.medicine_id} value={m.medicine_id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                placeholder="Dosage"
                value={item.dosage}
                onChange={(e) => {
                  const next = [...rxItems];
                  next[idx].dosage = e.target.value;
                  setRxItems(next);
                }}
              />
              <input
                className={inputCls}
                placeholder="Frequency"
                value={item.frequency}
                onChange={(e) => {
                  const next = [...rxItems];
                  next[idx].frequency = e.target.value;
                  setRxItems(next);
                }}
              />
              <input
                className={inputCls}
                placeholder="Days"
                value={item.duration_days}
                onChange={(e) => {
                  const next = [...rxItems];
                  next[idx].duration_days = e.target.value;
                  setRxItems(next);
                }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setRxItems([...rxItems, { medicine_id: "", dosage: "", frequency: "", duration_days: "" }])
            }
            className="text-xs text-blue-600 hover:underline"
          >
            + add another medicine
          </button>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              Save prescription
            </button>
            {status && (
              <span className={status.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                {status.message}
              </span>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}

function SymptomSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/symptom-search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.results || []);
    setLoading(false);
  }

  return (
    <Card>
      <p className="text-sm text-slate-800 mb-4">
        Search past clinical notes by symptom or keyword (MongoDB text search), joined back to each
        case&rsquo;s full record in MySQL.
      </p>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          className={inputCls}
          placeholder="e.g. chest tightness wheezing"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition whitespace-nowrap"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="space-y-3">
        {results?.map((r) => (
          <div key={r.visit_id} className="border border-slate-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-slate-800">
                {r.sql_record?.patient_name || "Unknown patient"} — visit #{r.visit_id}
              </span>
              <span className="text-xs text-slate-700">score {r.score?.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-800 mb-2">
              Diagnosis: {r.sql_record?.diagnosis_code || "—"} · Doctor: {r.sql_record?.doctor_name}
            </p>
            <p className="text-sm text-slate-700 mb-2">{r.notes}</p>
            <div className="flex flex-wrap gap-1">
              {r.symptoms?.map((s) => (
                <span key={s} className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
        {results?.length === 0 && (
          <p className="text-slate-700 text-sm text-center py-6">No similar cases found.</p>
        )}
      </div>
    </Card>
  );
}
