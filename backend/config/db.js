import mysql from "mysql2";
import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

// Connection Pool use karein jo automatic reconnect karta hai
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database:
    process.env.MYSQL_DATABASE ||
    process.env.MYSQLDATABASE ||
    process.env.DB_NAME,
  port: Number(
    process.env.MYSQLPORT ||
    process.env.DB_PORT ||
    3306
  ),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const promisePool = pool.promise();

// IMPORTANT: keep a reference to the ORIGINAL query method
// before we overwrite pool.query, or the callback branch below
// will call itself forever and blow the call stack.
const originalQuery = pool.query.bind(pool);

// query method ko promise-based aur callback dono ke liye compatible banayein
pool.query = (...args) => {
  const callback = args[args.length - 1];
  if (typeof callback === "function") {
    return originalQuery(...args); // call the real mysql2 method, not pool.query
  }
  return promisePool.query(...args);
};

pool.getConnection((err, connection) => {
  if (err) {
    console.error("MySQL connection failed:", err);
    console.error("Config used:", {
      host: process.env.MYSQLHOST || process.env.DB_HOST,
      user: process.env.MYSQLUSER || process.env.DB_USER,
      database:
        process.env.MYSQL_DATABASE ||
        process.env.MYSQLDATABASE ||
        process.env.DB_NAME,
      port: process.env.MYSQLPORT || process.env.DB_PORT,
    });
    return;
  }
  console.log("MySQL connected successfully via pool!");
  connection.release();
});

export default pool;