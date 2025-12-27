const { Client } = require('pg');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const username = String(payload.username || '').trim();
  const score = Number.parseInt(String(payload.score ?? ''), 10);

  if (!username) return json(400, { error: 'Missing username' });
  if (!Number.isFinite(score)) return json(400, { error: 'Missing score' });
  if (username.length > 50) return json(400, { error: 'Username too long' });
  if (score < 0) return json(400, { error: 'Invalid score' });

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query(
      `INSERT INTO scores (username, score)
       VALUES ($1, $2)
       RETURNING id, username, score, date`,
      [username, score],
    );
    return json(200, result.rows[0]);
  } catch (err) {
    return json(500, { error: 'Server Error' });
  } finally {
    await client.end().catch(() => {});
  }
};
