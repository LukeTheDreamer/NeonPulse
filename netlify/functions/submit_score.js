const { Client } = require('pg');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: "Unauthorized" };

  const { gameId, score } = JSON.parse(event.body);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Save the score
    await client.query(
      'INSERT INTO scores (game_id, user_id, score) VALUES ($1, $2, $3)',
      [gameId, user.sub, score]
    );

    // 2. ACHIEVEMENT LOGIC: "First Blood"
    // Grant 500 bonus credits for the first time someone submits a score
    const achievementCheck = await client.query(
      'INSERT INTO achievements (user_id, game_id, achievement_key) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id',
      [user.sub, gameId, 'first_score']
    );

    if (achievementCheck.rows.length > 0) {
      await client.query(
        'UPDATE users SET credits = credits + 500 WHERE user_id = $1',
        [user.sub]
      );
      console.log(`Achievement Unlocked: First Score for ${user.sub}`);
    }

    await client.end();
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    if (client) await client.end();
    return { statusCode: 500, body: "Score submission failed." };
  }
};