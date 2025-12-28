const { Client } = require('pg');

exports.handler = async (event) => {
  // 1. Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 2. Fetch Top 10 Scores with User Info
    // We use a LEFT JOIN to ensure we get user data
    // SPLIT_PART(u.email, '@', 1) acts as a fallback "Pilot Name" 
    const query = `
      SELECT 
        s.score, 
        s.created_at,
        COALESCE(s.metadata->>'username', SPLIT_PART(u.email, '@', 1)) as username
      FROM scores s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.game_id = 'neon-storm'
      ORDER BY s.score DESC
      LIMIT 10;
    `;

    const result = await client.query(query);
    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result.rows),
    };

  } catch (error) {
    console.error('Leaderboard Fetch Error:', error);
    if (client) await client.end();

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to retrieve leaderboard' }),
    };
  }
};