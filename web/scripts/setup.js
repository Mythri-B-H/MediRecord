// One-time project setup. Run from the web/ folder:   node scripts/setup.js
//
// 1. asks for your MySQL password (and MongoDB URI)
// 2. RESETS and builds the MySQL database (tables, triggers, procedure, views)
// 3. writes web/.env.local for you (random JWT secret)
// 4. creates the MongoDB collection + indexes (if mongosh is installed)
// 5. loads the demo data (users, patients, visits, prescriptions, bills, notes)
//
// Uses only Node built-ins so it works right after `npm install`.
// Flags:  --yes   skip the "reset database?" confirmation

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const { spawnSync } = require("child_process");

const webDir = path.join(__dirname, "..");
const root = path.join(webDir, "..");
const sqlDir = path.join(root, "sql");
const mongoDir = path.join(root, "mongodb");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, def = "") =>
  new Promise((res) => rl.question(def ? `${q} [${def}]: ` : `${q}: `, (a) => res(a.trim() || def)));

function fail(msg) {
  console.error(`\nX ${msg}`);
  rl.close();
  process.exit(1);
}

function mysqlRun({ user, host, port, password }, args, input) {
  const r = spawnSync("mysql", ["-h", host, "-P", String(port), "-u", user, "--default-character-set=utf8mb4", ...args], {
    input,
    encoding: "utf8",
    env: { ...process.env, MYSQL_PWD: password },
  });
  if (r.error && r.error.code === "ENOENT") {
    fail(
      "The 'mysql' command was not found. Add the MySQL 'bin' folder to your PATH " +
        "(e.g. C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin), open a NEW terminal and retry."
    );
  }
  return r;
}

(async () => {
  console.log("\n=== MediRecord setup ===\n");

  const host = process.env.MEDIRECORD_MYSQL_HOST || "localhost";
  const port = process.env.MEDIRECORD_MYSQL_PORT || "3306";
  const user = process.env.MEDIRECORD_MYSQL_USER || "root";
  const password = process.env.MEDIRECORD_MYSQL_PASSWORD ?? (await ask(`MySQL password for user '${user}'`));
  const mongoUri = process.env.MEDIRECORD_MONGODB_URI || (await ask("MongoDB URI", "mongodb://localhost:27017"));
  const my = { user, host, port, password };

  // ---- connection check ----
  const ping = mysqlRun(my, ["-e", "SELECT 1"]);
  if (ping.status !== 0) {
    fail(`Could not log in to MySQL as '${user}'.\n  ${(ping.stderr || "").trim()}\n  Check the password and that the MySQL service is running.`);
  }
  console.log("OK  MySQL login works");

  // ---- confirm reset ----
  if (!process.argv.includes("--yes")) {
    const a = await ask("This RESETS the 'medirecord' database (all its data is replaced with the demo data). Continue? (y/N)", "N");
    if (!/^y/i.test(a)) {
      rl.close();
      console.log("Cancelled. Nothing was changed.");
      process.exit(0);
    }
  }

  // ---- MySQL schema ----
  let r = mysqlRun(my, ["-e", "DROP DATABASE IF EXISTS medirecord"]);
  if (r.status !== 0) fail(`Could not reset database:\n${r.stderr}`);

  for (const file of ["ddl_schema_mysql.sql", "advanced_features_mysql.sql"]) {
    r = mysqlRun(my, [], fs.readFileSync(path.join(sqlDir, file), "utf8"));
    if (r.status !== 0) fail(`${file} failed:\n${r.stderr}`);
    console.log(`OK  ${file}`);
  }

  // ---- .env.local ----
  const envPath = path.join(webDir, ".env.local");
  if (fs.existsSync(envPath)) fs.copyFileSync(envPath, envPath + ".bak");
  fs.writeFileSync(
    envPath,
    [
      `MYSQL_HOST=${host}`,
      `MYSQL_PORT=${port}`,
      `MYSQL_USER=${user}`,
      `MYSQL_PASSWORD=${password}`,
      `MYSQL_DATABASE=medirecord`,
      `MONGODB_URI=${mongoUri}`,
      `MONGODB_DB=medirecord`,
      `JWT_SECRET=${crypto.randomBytes(32).toString("hex")}`,
      "",
    ].join("\n")
  );
  console.log("OK  web/.env.local written");

  // ---- MongoDB collection + indexes (optional: seed also creates them) ----
  const m = spawnSync("mongosh", [`${mongoUri.replace(/\/$/, "")}/medirecord`, path.join(mongoDir, "mongodb_setup.js")], {
    encoding: "utf8",
  });
  if (m.error && m.error.code === "ENOENT") {
    console.log("--  mongosh not found, skipping (the demo-data step creates the MongoDB indexes anyway)");
  } else if (m.status !== 0) {
    console.log(`--  mongosh setup reported a problem (continuing):\n${(m.stderr || m.stdout || "").trim()}`);
  } else {
    console.log("OK  MongoDB collection + indexes");
  }

  rl.close();

  // ---- demo data ----
  console.log("\nLoading demo data...");
  const s = spawnSync(process.execPath, [path.join(__dirname, "seed-demo.js")], { stdio: "inherit", cwd: webDir });
  if (s.status !== 0) {
    console.error("\nX Demo data step failed (see message above). Fix that, then run:  node scripts/seed-demo.js");
    process.exit(1);
  }

  console.log("\nAll set.  Start the app with:   npm run dev     then open http://localhost:3000\n");
})();
