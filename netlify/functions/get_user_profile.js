const { Client } = require('pg');

exports.handler = async (event, context) => {
  // 1. Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 2. SECURITY: Identify the user via Netlify Identity
  // Netlify automatically populates context.clientContext.user if a valid JWT is sent
  const { user } = context.clientContext;
  
  if (!user) {
    return { 
      statusCode: 401, 
      body: JSON.stringify({ error: 'Identification required. Please login.' }) 
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 3. LAZY SYNC & FETCH
    // We attempt to find the user. If they don't exist, we create them.
    // user.sub is the unique ID provided by Netlify Identity.
    const userQuery = `
      INSERT INTO users (user_id, email)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
      RETURNING user_id, email, credits, is_premium;
    `;
    
    const res = await client.query(userQuery, [user.sub, user.email]);
    const userData = res.rows[0];

    await client.end();

    // 4. RETURN DATA TO APP.JS
    // This matches the properties expected by your React State: setUser({ ...dbData })
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: userData.user_id,
        email: userData.email,
        credits: userData.credits || 0,
        isPremium: userData.is_premium || false
      }),
    };

  } catch (error) {
    console.error('Database Sync Error:', error);
    if (client) await client.end();
    
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'System connection failed.' }) 
    };
  }
};