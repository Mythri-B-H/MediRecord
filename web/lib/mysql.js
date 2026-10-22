import mysql from "mysql2/promise";

// Single shared connection pool, reused across API routes and across
// hot-reloads in dev (Next.js re-imports modules, so we cache it on
// globalThis to avoid exhausting MySQL's connection limit).
let pool = globalThis._medirecordMysqlPool;

if (!pool) {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  globalThis._medirecordMysqlPool = pool;
}

export default pool;

// Convenience helper: run a parameterized query and return just the rows.
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
