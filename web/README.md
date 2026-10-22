# MediRecord — Web Application

Next.js app for the MediRecord DBMS Level 3 project (Option 1: SQL + NoSQL — MySQL + MongoDB). This is the functional web interface required by the project (role-based forms, dashboards, search) connected to both databases through a backend API layer.

## Features by role

| Role | Pages | What it does |
|---|---|---|
| **Admin** | `/admin` | Create doctor accounts; view clinic-wide analytics (revenue/appointments per doctor, pulled from the `doctor_revenue_summary` SQL view) |
| **Doctor** | `/doctor` | View own appointments; record a visit (vitals + diagnosis → MySQL, free-text notes + symptom tags → MongoDB); write prescriptions; **symptom-similarity search** across past clinical notes (MongoDB `$text` search, joined back to MySQL for full case detail) |
| **Receptionist** | `/receptionist` | Register patients; book appointments; generate bills (calls the `generate_bill()` stored procedure) and mark them paid |

All three roles log in through `/login`; `proxy.js` (Next.js 16's route-protection file, formerly called middleware) redirects unauthenticated users to `/login` and redirects each role to their own section if they try to visit another role's pages. Every API route also independently re-checks the caller's role server-side (`lib/auth.js` → `requireRole`), so the UI guard is a convenience, not the only security boundary.

## Prerequisites

- Node.js 18.18+ (tested on Node 22)
- A running **MySQL 8.0** instance with the schema from `../sql/ddl_schema_mysql.sql` and `../sql/advanced_features_mysql.sql` already applied
- A running **MongoDB** instance with `../mongodb/mongodb_setup.js` already applied (creates the `clinical_notes` collection + text index)

## Setup

**Easiest (Windows):** run `setup.bat` from the project's root folder. It does everything below for you.

**Any OS:**

```bash
npm install
node scripts/setup.js     # builds both databases, writes .env.local, loads demo data
npm run dev               # http://localhost:3000
```

`scripts/setup.js` asks for your MySQL password and MongoDB URI, resets and builds the `medirecord` MySQL database (`../sql/ddl_schema_mysql.sql` + `../sql/advanced_features_mysql.sql`), writes `.env.local` with a random JWT secret, creates the MongoDB collection and indexes, and loads the demo data.

`.env.local` is in `.gitignore` — never commit real credentials. The template is `.env.local.example`.

### Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@medirecord.com | rkb@123 |
| Receptionist | reception@medirecord.com | password123 |
| Doctor (Pulmonology) | arvind.rao@medirecord.com | doctor@123 |
| Doctor (General Medicine) | priya.sharma@medirecord.com | doctor@123 |

### Scripts

| Command | What it does |
|---|---|
| `node scripts/setup.js` | Full first-time setup (databases, `.env.local`, demo data) |
| `node scripts/seed-demo.js` | Reset and reload the demo data (8 patients, 8 completed visits with notes, prescriptions and bills, 3 scheduled appointments) |
| `node scripts/seed-user.js <Role> "Name" email password` | Create (or reset) a single login for any role |
| `node scripts/seed-admin.js "Name" email password` | Create an Admin login |

A full walkthrough for the demonstration is in [`../docs/DEMO_GUIDE.md`](../docs/DEMO_GUIDE.md).

## Project structure

```
app/
├── login/page.js           Login form
├── admin/page.js           Admin dashboard (analytics, manage doctors)
├── doctor/page.js          Doctor dashboard (appointments, visits, Rx, symptom search)
├── receptionist/page.js    Receptionist dashboard (register, book, billing)
└── api/
    ├── auth/login/route.js       Login (bcrypt + JWT cookie) / logout
    ├── auth/me/route.js          Current session check
    ├── patients/route.js         List / register patients
    ├── doctors/route.js          List doctors / create doctor account (transaction)
    ├── appointments/route.js     List / book appointments (transaction)
    ├── visits/route.js           Record a visit — writes to MySQL + MongoDB
    ├── prescriptions/route.js    Create a prescription with items (transaction)
    ├── billing/route.js          Generate a bill (calls generate_bill() SQL procedure)
    ├── medicines/route.js        List medicine catalog
    ├── symptom-search/route.js   MongoDB text search, joined to MySQL
    └── analytics/route.js        Admin stats, from the doctor_revenue_summary view
lib/
├── mysql.js      MySQL connection pool
├── mongodb.js    MongoDB client + clinical_notes collection accessor
└── auth.js       JWT sign/verify, session helpers, role enforcement
proxy.js          Route protection (login redirect, role-based access)
scripts/
└── seed-admin.js First-run script to create the initial Admin login
```

## Security notes (per project requirements)

- Passwords are hashed with `bcryptjs` before storage — never stored or compared in plaintext.
- Database credentials and the JWT secret are read from `.env.local`, never hard-coded in source.
- The session cookie is `httpOnly` and `sameSite: lax`, so it isn't readable from client-side JS.
- All SQL queries use parameterized placeholders (`mysql2`'s `?` syntax) — no string-concatenated SQL.
- Every API route re-validates the caller's role server-side, independent of the UI/proxy redirect.

## Tech stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · `mysql2` · `mongodb` driver · `bcryptjs` · `jsonwebtoken`
