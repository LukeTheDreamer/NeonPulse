const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
    // Check for Token Header
    const token = event.headers.authorization?.split(' ')[1];
    if (!token) {
        return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: "Unauthorized" })
        };
    }

    try {
        // Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sql = neon();

        // Fetch fresh data
        const result = await sql`SELECT id, username, credits, inventory FROM users WHERE id = ${decoded.userId}`;

        if (result.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: "User not found" })
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result[0])
        };

    } catch (err) {
        return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: "Invalid Token" })
        };
    }
};
