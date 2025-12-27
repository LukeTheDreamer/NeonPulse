const { neon } = require('@netlify/neon');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    const { username, email, password } = JSON.parse(event.body);

    // Basic Validation
    if (!username || !password || !email) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: "Missing fields" }) };
    }

    const sql = neon();

    try {
        // 1. Check if user exists
        const check = await sql`SELECT id FROM users WHERE email = ${email} OR username = ${username}`;
        if (check.length > 0) {
            return { statusCode: 409, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: "User already exists" }) };
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 3. Insert User (Give 1000 starting credits!)
        const result = await sql`
            INSERT INTO users (username, email, password_hash, credits, inventory)
            VALUES (${username}, ${email}, ${hash}, 1000, '["NEON"]'::jsonb)
            RETURNING id, username, credits, inventory
        `;

        const user = result[0];

        // 4. Generate Token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, user })
        };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: "Server Error" }) };
    }
};