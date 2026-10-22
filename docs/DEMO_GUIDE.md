# MediRecord — Demo Guide

A script for the final demonstration (about 12–15 minutes). Every step says **what to do**, **what to say**, and **which requirement it proves**.

## Before you walk in (5 minutes earlier)

1. Make sure the **MySQL** and **MongoDB** services are running (they start with Windows by default).
2. Double-click **`reset-demo-data.bat`** → puts the data back to the clean demo state (3 appointments waiting to be recorded).
3. Double-click **`start.bat`** → the app opens at <http://localhost:3000>. Leave that window open.
4. Open a **second terminal** in the project folder for the database part (Part 3 below).
5. Open these in tabs/windows: `diagrams/ER_Diagram.png`, `diagrams/System_Architecture.png`, and the GitHub repo.

**Logins**

| Role | Email | Password |
|---|---|---|
| Admin | admin@medirecord.com | rkb@123 |
| Receptionist | reception@medirecord.com | password123 |
| Doctor (Pulmonology) | arvind.rao@medirecord.com | doctor@123 |
| Doctor (General Medicine) | priya.sharma@medirecord.com | doctor@123 |

Tip: use one browser window and **Logout** between roles.

---

## Part 1 — Introduction (2 min)

**Show:** `System_Architecture.png`, then `ER_Diagram.png`.

**Say:** "MediRecord is a clinic records system. Structured data (patients, appointments, visits, prescriptions, bills) is relational, so it lives in **MySQL**. Free-text clinical notes and symptom tags are flexible documents, so they live in **MongoDB**. The web app, built with Next.js, talks to both through a backend API and joins them using `visit_id`."

*Proves: problem statement, two database paradigms (SQL + NoSQL), ER diagram, architecture.*

---

## Part 2 — The application (7 min)

### 2.1 Admin (1.5 min) — login as Admin
- **Analytics** tab: revenue per doctor, appointments, unique patients.
  *Say:* "This table is read from a **SQL view**, `doctor_revenue_summary`. Revenue counts paid bills only."
- **Manage Doctors** tab: add a doctor (any details).
  *Say:* "Creating a doctor writes to two tables inside one **transaction**: if the second insert fails, the first is rolled back."

*Proves: role-based access (Admin), views, transactions, forms + validation.*

### 2.2 Receptionist (1.5 min) — Logout, login as Receptionist
- **Register Patient:** add a patient.
- **Book Appointment:** pick the patient and Dr. Arvind Rao, choose a date/time, book.
- **Role guard demo:** in the address bar type `localhost:3000/admin` → you are redirected away.
  *Say:* "Each role can only open its own pages. This is also re-checked on the server for every API call, so hiding a button is not the only protection."

*Proves: role-based authentication/authorization, data entry, security.*

### 2.3 Doctor (2.5 min) — Logout, login as **Arvind Rao**
- **My Appointments:** he sees only his own appointments.
- First click a **completed** appointment (e.g. **Mohammed Faiz**): the saved visit opens, with vitals and diagnosis (MySQL), clinical notes and symptom tags (MongoDB), the prescription, and the bill.
  *Say:* "One screen, but it combines both databases plus the billing table."
- Now click **Ravi Kumar (scheduled)** → fill the visit:
  - BP `130/85`, Temp `98.6`, Pulse `86`, Diagnosis `J45`
  - Symptoms: `wheezing, chest tightness, night cough`
  - Notes: `Wheezing at night, worse after dust exposure. Known asthmatic.`
- Click **Save visit** → "Visit recorded (saved to MySQL + MongoDB)".
  *Say:* "The vitals and diagnosis went to MySQL. The free-text note and symptom tags went to MongoDB. The two are linked by the visit id."
- Add a prescription: **Salbutamol Inhaler**, dosage `2 puffs`, frequency `3 times a day`, days `10` → **Save prescription**.
  *Say:* "The prescription header and its items are saved in one transaction, and a **database trigger** automatically wrote an audit-log entry."

*Proves: MySQL + MongoDB integration, transactions, triggers, role-based data scoping.*

### 2.4 Symptom Search (1 min) — still as Doctor
- **Symptom Search** tab → search `wheezing chest`.
  Expect Ravi Kumar (the one you just recorded), Sneha Rao and Mohammed Faiz, each with the matching note, symptom tags and SQL record (patient, diagnosis, doctor). Cases like Karthik's fever do not appear.
  *Say:* "MongoDB runs a **full-text search** with relevance ranking on the notes, then the app joins the matching visit ids back to MySQL to fetch the full case. Plain SQL `LIKE` could not rank free text like this."

*Proves: NoSQL feature, full-text search/indexing, application-level join.*

### 2.5 Billing (1 min) — Logout, login as Receptionist
- **Billing Status** → in **Generate a bill**, choose the new visit (Ravi Kumar) → fee `500` → **Generate bill**.
  *Say:* "This calls the **stored procedure** `generate_bill`: consultation fee plus the medicines prescribed, plus tax."
- Click **Mark paid** on the new bill.
- (Optional) Login as Admin → Analytics: the doctor's revenue went up.

*Proves: stored procedure, views, end-to-end workflow.*

---

## Part 3 — The database layer (4 min)

In the second terminal, from the project folder:

```
mysql -u root -p medirecord < sql\demo_queries.sql
```

It prints labelled sections. For a calmer demo, paste one section at a time into `mysql -u root -p medirecord`.

| Section in `demo_queries.sql` | Say | Requirement |
|---|---|---|
| 2 DML | INSERT / UPDATE / DELETE | DML |
| 3 / 3b JOIN, LEFT JOIN | 4-table join; appointments without visits | JOIN |
| 4 / 4b / 4c GROUP BY + HAVING | doctors with ≥ 4 visits; repeated diagnoses; billing summary | GROUP BY / HAVING |
| 5 / 5b / 5c subqueries | above-average bills; IN; correlated | Subqueries |
| 6 / 6b views | `doctor_revenue_summary`, `doctor_dashboard_view` | Views |
| 7 / 7b triggers | audit rows written automatically; live update then rollback | Triggers |
| 8 transaction | visit + prescription + bill as one unit, then ROLLBACK leaves nothing | Transactions + procedure |
| 9 / 9b indexes | `SHOW INDEX`; `EXPLAIN` shows the index is used | Indexing |
| 10 security | passwords are bcrypt hashes (60 chars), never plaintext | Security |

Then the integrity demo (each statement is *supposed* to fail):

```
mysql -u root -p --force medirecord < sql\demo_integrity_errors.sql
```

*Say:* "Bad gender, negative price, duplicate email, second bill for a visit, orphan appointment, deleting a patient who has appointments — the database rejects all of them. That is CHECK, UNIQUE, and FOREIGN KEY/RESTRICT."

*Proves: data validation and integrity, DDL constraints.*

And the NoSQL side:

```
mongosh mongodb://localhost:27017/medirecord mongodb\mongodb_demo_queries.js
```

Shows the text search with relevance scores, tag matching, the **aggregation pipeline** (most common symptoms per diagnosis), and the index proof.

*Proves: NoSQL aggregation, indexing.*

---

## Part 4 — Security and engineering (1 min)

- **Passwords:** bcrypt-hashed (shown in `demo_queries.sql` section 10).
- **Credentials:** database passwords and the JWT secret are in `web/.env.local`, which is in `.gitignore`. Show the GitHub repo: no secrets there.
- **Sessions:** JWT in an httpOnly cookie, 8-hour expiry.
- **Queries:** parameterized (no string-built SQL), which prevents SQL injection.
- **GitHub:** show the commit history, with commits from both team members.

---

## Likely questions

**Why two databases?** Structured, relational data with integrity rules suits MySQL. Free-text notes need flexible schema and ranked text search, which MongoDB's text index gives.

**How are they connected?** `visit.mongo_note_id` in MySQL and `clinical_notes.visit_id` in MongoDB. The app fetches matching ids from MongoDB, then queries MySQL with `WHERE visit_id IN (...)`.

**What if MongoDB is down?** Visit saving and symptom search fail with an error; patients, appointments, billing (pure MySQL) keep working.

**Where is authorization enforced?** In `proxy.js` for page access, and again inside every API route (`requireRole`) — so calling the API directly without the right role returns 401.

**Why a trigger for the audit log?** The log is written by the database itself, so no application code path can forget it or skip it.

**How is the demo data reset?** `reset-demo-data.bat` truncates and reloads everything through the same code paths the app uses (hashing, stored procedure, triggers).

---

## If something goes wrong during the demo

| Symptom | Fix |
|---|---|
| Page won't load | Is the `start.bat` window still open? Run `start.bat` again. |
| "Could not reach the server" on login | MySQL service not running (Windows Services → MySQL80 → Start). |
| Visit saves fail / symptom search errors | MongoDB service not running (Services → MongoDB Server → Start). |
| Data looks messy after rehearsing | Run `reset-demo-data.bat`. |
| Forgot which login | Table at the top of this guide. |
