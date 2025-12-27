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

    const { email, password } = JSON.parse(event.body);
    const sql = neon();

    try {
        // 1. Find User
        const result = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (result.length === 0) {
            return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: "Invalid credentials" }) };
        }

        const user = result[0];

        // 2. Check Password
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) {
            return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: "Invalid credentials" }) };
        }

        // 3. Generate Token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user data (excluding password)
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    credits: user.credits,
                    inventory: user.inventory
                }
            })
        };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: "Server Error" }) };
    }
};