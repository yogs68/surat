import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: mysql.Pool | undefined;
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Put it in .env.local");

export const pool: mysql.Pool =
  global.__mysqlPool ??
  mysql.createPool({
    uri: url,
    connectionLimit: 10,
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") global.__mysqlPool = pool;
