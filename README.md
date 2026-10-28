# MediRecord : Intelligent Clinical Records & Symptom-Similarity Search System

**SQL + NoSQL (MySQL + MongoDB)**

| Name | SRN |
|---|---|
| Rakshitha K B | PES2UG24CS918 |
| Mythri B H | PES2UG24CS290 |

## Problem Statement

Small and mid-sized clinics across India still rely on paper records, WhatsApp messages, or disconnected spreadsheets to manage patient visits, prescriptions, and diagnostic history. Doctors and staff struggle to quickly access complete patient histories, and existing systems lack effective ways to find past patients with similar symptoms, since traditional SQL searches are limited when dealing with unstructured, free-text clinical notes.

MediRecord addresses this with structured record management (MySQL) combined with intelligent, symptom-based similarity search over clinical notes (MongoDB), delivered through a role-based Next.js web application.

## Quick Start (Windows)

**Prerequisites:** Node.js (LTS), MySQL Community Server 8.0+, MongoDB Community Server (both services running), and optionally `mongosh`.

### Manual setup (any OS)

```bash
cd web
npm install
node scripts/setup.js      # asks for DB passwords, builds both databases, writes .env.local, loads demo data
npm run dev                # http://localhost:3000
```

step by step:

```bash
mysql -u root -p < sql/ddl_schema_mysql.sql
mysql -u root -p < sql/advanced_features_mysql.sql
mongosh mongodb://localhost:27017/medirecord mongodb/mongodb_setup.js
cd web && npm install && cp .env.local.example .env.local   # edit with your credentials
node scripts/seed-demo.js
npm run dev
```

## Repository Structure

```
MediRecord/
├── README.md
├── setup.bat / start.bat / reset-demo-data.bat   # Windows one-click helpers
├── docs/
│   └── mysql_execution_screenshots/              # Evidence of DDL run against live MySQL
├── diagrams/
│   ├── ER_Diagram.png                            # Relational-notation ER diagram
│   ├── ER_Diagram_Chen_Notation.png              # Chen-notation ER diagram
│   └── System_Architecture.png
├── sql/
│   ├── ddl_schema_mysql.sql                      # CREATE TABLE, constraints, indexes (11 tables)
│   ├── advanced_features_mysql.sql               # Triggers, stored procedure, views (re-runnable)
│   ├── demo_queries.sql                          # JOIN / GROUP BY / HAVING / subqueries / views / triggers / transaction / indexes
│   └── demo_integrity_errors.sql                 # Statements the database must reject (CHECK / UNIQUE / FK)
├── mongodb/
│   ├── mongodb_setup.js                          # Collection + indexes (text, unique visit_id, ...)
│   └── mongodb_demo_queries.js                   # Text search, aggregation, index proof
└── web/                                          # The Next.js application
    ├── app/                                      # Pages + API routes (see web/README.md)
    ├── lib/                                      # MySQL pool, MongoDB client, JWT auth helpers
    ├── proxy.js                                  # Role-based route protection
    └── scripts/
        ├── setup.js                              # One-command database + env + demo-data setup
        ├── seed-demo.js                          # (Re)loads the demo data set
        ├── seed-admin.js / seed-user.js          # Create individual logins
```

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend/API:** Next.js API routes
- **SQL Database:** MySQL 8.0 — 11 tables, triggers, stored procedure, views, transactions, indexes
- **NoSQL Database:** MongoDB — `clinical_notes` collection, text index, aggregation
- **Auth:** JWT (httpOnly cookie) + bcrypt password hashing, three roles
- **Version Control:** Git + GitHub


```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=medirecord
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=medirecord
JWT_SECRET=
```
