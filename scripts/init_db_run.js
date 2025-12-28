// Simple helper to call local init_db function
// Usage: INIT_DB_TOKEN=token node scripts/init_db_run.js
const fetch = require('node-fetch');
(async () => {
  const token = process.env.INIT_DB_TOKEN;
  if (!token) return console.error('Please set INIT_DB_TOKEN in environment');
  const url = process.env.NETLIFY_DEV_URL || 'http://localhost:8888/.netlify/functions/init_db';
  try {
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const body = await res.text();
    console.log('Response:', res.status, body);
  } catch (err) {
    console.error('Request failed:', err.message || err);
  }
})();