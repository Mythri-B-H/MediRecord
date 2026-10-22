// One-time setup script: creates the first Admin login so you can sign
// in and create Doctor/Receptionist accounts from the Admin dashboard.
//
// Usage:
//   node scripts/seed-admin.js "Admin Name" admin@medirecord.com password123
//
// Requires .env.local to be present (loaded automatically by Next.js at
// runtime, but this script runs standalone, so we load it manually).

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function main() {
  const [, , name, email, password] = process.argv;
  if (!name || !email || !password) {
    console.error('Usage: node scripts/seed-admin.js "Admin Name" admin@email.com password');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  const [[role]] = await conn.query(`SELECT role_id FROM role WHERE role_name = 'Admin'`);
  if (!role) {
    console.error("Admin role not found — did you run ddl_schema_mysql.sql first?");
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);

  await conn.execute(
    `INSERT INTO app_user (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)`,
    [name, email, password_hash, role.role_id]
  );

  console.log(`Admin account created: ${email}`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
