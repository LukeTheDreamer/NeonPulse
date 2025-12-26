const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const { username, email, password } = JSON.parse(event.body);
    
    // Basic Validation
    if (!username || !password || !email) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();

        // 1. Check if user exists
        const check = await client.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (check.rows.length > 0) {
            return { statusCode: 409, body: JSON.stringify({ error: "User already exists" }) };
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 3. Insert User (Give 1000 starting credits!)
        const result = await client.query(
            `INSERT INTO users (username, email, password_hash, credits, inventory) 
             VALUES ($1, $2, $3, 1000, '["NEON"]') 
             RETURNING id, username, credits, inventory`,
            [username, email, hash]
        );

        const user = result.rows[0];

        // 4. Generate Token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET, // You need to add this to Netlify Env Vars
            { expiresIn: '7d' }
        );

        return {
            statusCode: 201,
            body: JSON.stringify({ token, user })
        };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: "Server Error" }) };
    } finally {
        await client.end();
    }
};