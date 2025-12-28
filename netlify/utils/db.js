const { neon } = require('@netlify/neon');

let sqlSingleton = null;

function getSql() {
  if (!process.env.NETLIFY_DATABASE_URL && process.env.DATABASE_URL) {
    process.env.NETLIFY_DATABASE_URL = process.env.DATABASE_URL;
  }

  if (!sqlSingleton) {
    sqlSingleton = neon();
  }

  return sqlSingleton;
}

module.exports = { getSql };

