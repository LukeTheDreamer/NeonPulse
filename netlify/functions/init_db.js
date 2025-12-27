const { Client } = require('pg');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        body: JSON.stringify(body),
    };
}

function getBearerToken(event) {
    const header = event?.headers?.authorization ?? event?.headers?.Authorization;
    if (!header) return null;
    const [scheme, token] = String(header).split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
}

exports.handler = async (event) => {
    const initToken = process.env.INIT_DB_TOKEN;
    if (!initToken) return json(404, { error: 'Not found' });
    if (getBearerToken(event) !== initToken) return json(401, { error: 'Unauthorized' });

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    
    try {
        await client.connect();

        // Required for gen_random_uuid()
        await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
        
        // 1. Leaderboard Table (Existing)
        await client.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                score INTEGER NOT NULL,
                date DATE DEFAULT CURRENT_DATE
            );
        `);

        // 2. Users Table (NEW)
        // Stores Auth0 identity mapping, credits, and unlocked skins
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                auth0_sub TEXT UNIQUE,
                username TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                credits INT DEFAULT 1000,
                inventory JSONB DEFAULT '["NEON"]'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Backwards-compatible migration from the legacy email/password auth table shape
        try {
            await client.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);
        } catch (_) {
            // Column may not exist in the newer schema
        }

        return json(200, { ok: true, message: "Database initialized for Auth0-backed users." });
    } catch (err) {
        return json(500, { error: 'Server Error' });
    } finally {
        await client.end();
    }
};
