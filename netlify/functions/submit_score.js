const { Client } = require('pg');

exports.handler = async (event, context) => {
  // 1. SECURITY: Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 2. SECURITY: Check for Netlify Identity User
  // Netlify automatically decodes the JWT and puts the user info here.
  const { user } = context.clientContext;
  
  if (!user) {
    return { statusCode: 401, body: 'You must be logged in to save scores.' };
  }

  const { sub: userId, email } = user;
  
  // Parse the incoming data
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { gameId, score } = body;

  // 3. VALIDATION: Basic sanity checks
  if (!gameId || typeof score !== 'number') {
    return { statusCode: 400, body: 'Missing gameId or score' };
  }

  // Connect to Neon Database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Neon
  });

  try {
    await client.connect();

    // 4. LAZY SYNC: Ensure user exists in our DB
    // We use ON CONFLICT to do nothing if they already exist.
    // This removes the need for a separate registration flow.
    const syncUserQuery = `
      INSERT INTO users (user_id, email)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE 
      SET email = EXCLUDED.email; -- Update email if it changed in Google/Netlify
    `;
    await client.query(syncUserQuery, [userId, email]);

    // 5. SUBMIT SCORE
    // We insert the score. Since 'gameId' is a Foreign Key, 
    // this will fail automatically if you send a fake game ID.
    const insertScoreQuery = `
      INSERT INTO scores (user_id, game_id, score, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at;
    `;
    
    // Optional: Add metadata like timestamp to catch impossible speed-runs later
    const metadata = {
        submitted_at: new Date().toISOString(),
        platform: 'web',
        context: 'standard_play'
    };

    const result = await client.query(insertScoreQuery, [userId, gameId, score, metadata]);

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Score saved successfully!',
        scoreId: result.rows[0].id
      }),
    };

  } catch (error) {
    console.error('Database Error:', error);
    await client.end();

    // Handle specific errors nicely
    if (error.code === '23503') { // Postgres Foreign Key Violation (e.g., bad game_id)
        return { statusCode: 400, body: 'Invalid Game ID. Check your game config.' };
    }

    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
};