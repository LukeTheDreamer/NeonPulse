const { Client } = require('pg');

exports.handler = async (event, context) => {
  // 1. CORS Headers (Allows your game to talk to this script)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  // 2. Handle Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 3. Connect to Database (Only if configured)
  if (!process.env.DATABASE_URL) {
    return { statusCode: 200, headers, body: JSON.stringify({ message: "No DB configured, score ignored (Dev Mode)" }) };
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    const data = JSON.parse(event.body);
    const { username, score } = data;

    // Simple Validation
    if (!username || !score) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing data" }) };
    }

    // Insert Score
    const query = 'INSERT INTO scores (username, score, date) VALUES ($1, $2, NOW()) RETURNING *';
    await client.query(query, [username, score]);

    await client.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Score saved!" }),
    };

  } catch (error) {
    console.error("DB Error:", error);
    await client.end(); // Ensure connection closes
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};