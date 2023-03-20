const { Pool } = require("pg");

async function getConnectionPool() {
  const pool = new Pool({
    max: process.env.DB_MAX_CONNECTIONS || 5,
    min: process.env.DB_MIN_CONNECTIONS || 0,
    idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT || 1200000,
    connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT || 100000,
  });

  try {
    await pool.connect();
    return pool;
  } catch (err) {
    throw new Error(`Error connecting to the database: ${err}`);
  }
}

module.exports = {
  getConnectionPool,
};