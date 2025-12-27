const { neon } = require('@netlify/neon');

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON' })
        };
    }

    const { username, score } = body;

    // Validate input
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Username is required' })
        };
    }

    if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Valid score is required' })
        };
    }

    // Sanitize username (max 50 chars, alphanumeric and underscores only)
    const sanitizedUsername = username.trim().substring(0, 50).replace(/[^a-zA-Z0-9_]/g, '');

    if (sanitizedUsername.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Username must contain valid characters' })
        };
    }

    const sql = neon();

    try {
        // Insert the new score
        const result = await sql`
            INSERT INTO scores (username, score, date)
            VALUES (${sanitizedUsername}, ${score}, CURRENT_DATE)
            RETURNING id, username, score, date
        `;

        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Score submitted successfully',
                score: result[0]
            })
        };

    } catch (err) {
        console.error('Database error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server Error' })
        };
    }
};
