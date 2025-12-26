const { Client } = require('pg');

exports.handler = async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    
    try {
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

        return { statusCode: 200, body: "Database initialized with Users table." };
    } catch (err) {
        return { statusCode: 500, body: err.toString() };
    } finally {
        await client.end();
    }
};