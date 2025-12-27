const { neon } = require('@netlify/neon');

exports.handler = async (event) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    const sql = neon();

    try {
        // Fetch top 50 scores, ordered by score descending
        const result = await sql`
            SELECT username, score, date
            FROM scores
            ORDER BY score DESC
            LIMIT 50
        `;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        };

    } catch (err) {
        console.error('Database error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server Error' })
        };
    }
};
