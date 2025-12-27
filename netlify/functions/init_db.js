const { Client } = require('pg');

exports.handler = async () => {
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
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth0_sub TEXT;`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_auth0_sub_unique ON users(auth0_sub);`);
        try {
            await client.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);
        } catch (_) {
            // Column may not exist in the newer schema
        }

        return { statusCode: 200, body: "Database initialized for Auth0-backed users." };
    } catch (err) {
        return { statusCode: 500, body: err.toString() };
    } finally {
        await client.end();
    }
};
