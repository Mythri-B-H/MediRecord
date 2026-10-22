"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function ReceptionistPage() {
  const [tab, setTab] = useState("register");

  return (
    <DashboardShell title="Receptionist" roleLabel="Receptionist">
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          ["register", "Register Patient"],
          ["book", "Book Appointment"],
          ["billing", "Billing Status"],
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

      {tab === "register" && <RegisterPatient />}
      {tab === "book" && <BookAppointment />}
      {tab === "billing" && <BillingStatus />}
    </DashboardShell>
  );
}

function Card({ children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

function RegisterPatient() {
  const [form, setForm] = useState({
    name: "",
    dob: "",
    gender: "Male",
    phone: "",
    address: "",
    blood_group: "",
  });
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus({ ok: true, message: `Patient registered (ID ${data.patient_id})` });
      setForm({ name: "", dob: "", gender: "Male", phone: "", address: "", blood_group: "" });
    } else {
      setStatus({ ok: false, message: data.error || "Failed to register patient" });
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name">
          <input
            required
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Date of birth">
          <input
            type="date"
            required
            className={inputCls}
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
          />
        </Field>
        <Field label="Gender">
          <select
            className={inputCls}
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Phone">
          <input
            required
            className={inputCls}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Blood group">
          <input
            className={inputCls}
            placeholder="O+"
            value={form.blood_group}
            onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
          />
        </Field>
        <Field label="Address">
          <input
            className={inputCls}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>

        <div className="sm:col-span-2 flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            Register patient
          </button>
          {status && (
            <span className={status.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
              {status.message}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

function BookAppointment() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ patient_id: "", doctor_id: "", scheduled_at: "" });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/patients").then((r) => r.json()).then((d) => setPatients(d.patients || []));
    fetch("/api/doctors").then((r) => r.json()).then((d) => setDoctors(d.doctors || []));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus({ ok: true, message: `Appointment booked (ID ${data.appointment_id})` });
    } else {
      setStatus({ ok: false, message: data.error || "Failed to book appointment" });
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Patient">
          <select
            required
            className={inputCls}
            value={form.patient_id}
            onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.name} (#{p.patient_id})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Doctor">
          <select
            required
            className={inputCls}
            value={form.doctor_id}
            onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
          >
            <option value="">Select doctor…</option>
            {doctors.map((d) => (
              <option key={d.doctor_id} value={d.doctor_id}>
                Dr. {d.name} — {d.specialization}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date & time">
          <input
            type="datetime-local"
            required
            className={inputCls}
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
          />
        </Field>

        <div className="sm:col-span-2 flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            Book appointment
          </button>
          {status && (
            <span className={status.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
              {status.message}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

function BillingStatus() {
  const [bills, setBills] = useState([]);
  const [unbilled, setUnbilled] = useState([]);
  const [form, setForm] = useState({ visit_id: "", consultation_fee: "300", tax_rate: "0.05" });
  const [status, setStatus] = useState(null);

  async function load() {
    const [b, u] = await Promise.all([
      fetch("/api/billing").then((r) => r.json()),
      fetch("/api/billing?unbilled=1").then((r) => r.json()),
    ]);
    setBills(b.bills || []);
    setUnbilled(u.visits || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visit_id: Number(form.visit_id),
        consultation_fee: Number(form.consultation_fee),
        tax_rate: Number(form.tax_rate),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus({ ok: true, message: `Bill generated: total ₹${data.bill.total_amount}` });
      setForm({ ...form, visit_id: "" });
      load();
    } else {
      setStatus({ ok: false, message: data.error || "Could not generate bill" });
    }
  }

  async function setPayment(bill_id, payment_status) {
    await fetch("/api/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bill_id, payment_status }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-medium text-slate-800 mb-1">Generate a bill</h3>
        <p className="text-xs text-slate-700 mb-4">
          Calls the <code>generate_bill()</code> stored procedure: consultation fee + medicines
          prescribed + tax.
        </p>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <select
            required
            className={`${inputCls} sm:col-span-2`}
            value={form.visit_id}
            onChange={(e) => setForm({ ...form, visit_id: e.target.value })}
          >
            <option value="">Select visit awaiting a bill…</option>
            {unbilled.map((v) => (
              <option key={v.visit_id} value={v.visit_id}>
                Visit #{v.visit_id} — {v.patient_name} (Dr. {v.doctor_name})
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Consultation fee"
            value={form.consultation_fee}
            onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Tax rate e.g. 0.05"
            value={form.tax_rate}
            onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
          />
          <div className="sm:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              Generate bill
            </button>
            {status && (
              <span className={status.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                {status.message}
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-800 border-b border-slate-200">
                <th className="py-2 pr-4">Bill ID</th>
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2 pr-4">Consultation</th>
                <th className="py-2 pr-4">Medicines</th>
                <th className="py-2 pr-4">Tax</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.bill_id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{b.bill_id}</td>
                  <td className="py-2 pr-4">{b.patient_name}</td>
                  <td className="py-2 pr-4">₹{b.consultation_fee}</td>
                  <td className="py-2 pr-4">₹{b.medicine_total}</td>
                  <td className="py-2 pr-4">₹{b.tax}</td>
                  <td className="py-2 pr-4 font-medium">₹{b.total_amount}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.payment_status === "paid"
                          ? "bg-green-100 text-green-700"
                          : b.payment_status === "refunded"
                          ? "bg-slate-100 text-slate-800"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {b.payment_status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {b.payment_status === "pending" && (
                      <button
                        onClick={() => setPayment(b.bill_id, "paid")}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-700">
                    No bills yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
