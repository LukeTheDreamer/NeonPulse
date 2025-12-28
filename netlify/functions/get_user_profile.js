const { Client } = require('pg');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: "Unauthorized" };

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
  try {
    await client.connect();
    const query = 'INSERT INTO users (user_id, email) VALUES (\, \) ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email RETURNING *;';
    const res = await client.query(query, [user.sub, user.email]);
    await client.end();
    return { statusCode: 200, body: JSON.stringify(res.rows[0]) };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
