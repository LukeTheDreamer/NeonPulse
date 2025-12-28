const { getSql } = require('../utils/db');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method Not Allowed' });

  const rawLimit = event.queryStringParameters?.limit;
  const limit = Math.max(1, Math.min(100, Number.parseInt(rawLimit || '10', 10) || 10));

  try {
    const sql = getSql();
    const rows = await sql(
      `SELECT username, score, date
       FROM scores
       ORDER BY score DESC, id DESC
       LIMIT $1`,
      [limit],
    );
    return json(200, rows);
  } catch (err) {
    return json(500, { error: 'Server Error' });
  }
};
