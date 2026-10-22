// Creates a login for any role (Admin, Doctor, Receptionist) directly in MySQL.
// Useful for the Receptionist, which has no "create account" screen in the UI.
//
// Usage:
//   node scripts/seed-user.js Receptionist "Reception Desk" reception@medirecord.com password123

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function main() {
  const [, , roleName, name, email, password] = process.argv;
  if (!roleName || !name || !email || !password) {
    console.error('Usage: node scripts/seed-user.js <Admin|Doctor|Receptionist> "Name" email password');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  const [[role]] = await conn.query(`SELECT role_id FROM role WHERE role_name = ?`, [roleName]);
  if (!role) {
    console.error(`Role "${roleName}" not found. Valid roles: Admin, Doctor, Receptionist.`);
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);

  // If the email already exists (e.g. from the broken manual INSERT), reset it instead of failing.
  await conn.execute(
    `INSERT INTO app_user (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role_id = VALUES(role_id)`,
    [name, email, password_hash, role.role_id]
  );

  console.log(`${roleName} account ready: ${email}`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
