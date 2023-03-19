const { Pool } = require("pg");

async function getConnectionPool() {
  try {
    const pool = new Pool({
      max: 5,
      min: 0,
      idleTimeoutMillis: 1200000,
      connectionTimeoutMillis: 100000,
    });

    return pool;
  } catch (err) {
    console.log(JSON.stringify(err));
    return null;
  }
}

module.exports = {
  getConnectionPool,
};
