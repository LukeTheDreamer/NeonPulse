const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const { email, password } = JSON.parse(event.body);
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();

        // 1. Find User
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
        }

        const user = result.rows[0];

        // 2. Check Password
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) {
            return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
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
        return { statusCode: 500, body: JSON.stringify({ error: "Server Error" }) };
    } finally {
        await client.end();
    }
};