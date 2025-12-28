const { Client } = require('pg');

exports.handler = async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    
    try {
        // Ensure pgcrypto is available for gen_random_uuid()
        // This requires the database role to have permission to create extensions.
        // If you use a managed DB that restricts extensions, switch to uuid_generate_v4()
        // and enable the "uuid-ossp" extension if needed.
        await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        await client.connect();
        
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
        // Stores login info, credits, and unlocked skins
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                credits INT DEFAULT 1000,
                inventory JSONB DEFAULT '["NEON"]'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        return { statusCode: 200, body: JSON.stringify({ message: "Database initialized with Users table." }) };
    } catch (err) {
        console.error('init_db error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.toString() }) };
    } finally {
        await client.end();
    }
};