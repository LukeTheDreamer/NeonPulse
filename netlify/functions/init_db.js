const { getSql } = require('../utils/db');

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
    
    try {
        const sql = getSql();

        // Ensure pgcrypto is available for gen_random_uuid()
        // This requires the database role to have permission to create extensions.
        // If you use a managed DB that restricts extensions, switch to uuid_generate_v4()
        // and enable the "uuid-ossp" extension if needed.
        await sql(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        // 1. Leaderboard Table (Existing)
        await sql(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                score INTEGER NOT NULL,
                date DATE DEFAULT CURRENT_DATE
            );
        `);

        // 2. Users Table (NEW)
        // Stores Auth0 identity mapping, credits, and unlocked skins
        await sql(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                auth0_sub TEXT UNIQUE,
                username TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                credits INT DEFAULT 1000,
                inventory JSONB DEFAULT '["NEON"]'::jsonb,
                unlocked_skins TEXT[] DEFAULT ARRAY['NEON']::text[],
                supporter_tier INT DEFAULT 0,
                ad_free_until TIMESTAMPTZ NULL,
                total_donated NUMERIC DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Payments table (used to record webhook-processed sessions and ensure idempotency)
        await sql(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                stripe_session_id TEXT UNIQUE,
                stripe_event_id TEXT,
                user_id UUID,
                amount NUMERIC,
                metadata JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Backwards-compatible migration from the legacy email/password auth table shape
        try {
            await sql(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);
        } catch (_) {
            // Column may not exist; ignore
        }

        return json(200, { ok: true, message: "Database initialized for Auth0-backed users." });
    } catch (err) {
        console.error('init_db error:', err);
        return json(500, { error: err.toString() });
    }
};
