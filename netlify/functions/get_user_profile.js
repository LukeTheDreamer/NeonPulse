const { Client } = require('pg');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    // Lazy Sync: Create user if they don't exist
    const res = await client.query(`
      INSERT INTO users (user_id, email)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
      RETURNING credits, is_premium;
    `, [user.sub, user.email]);

    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify(res.rows[0])
    };
  } catch (err) {
    if (client) await client.end();
    return { statusCode: 500, body: err.message };
  }
};