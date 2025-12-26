const { Client } = require('pg');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
    // Check for Token Header
    const token = event.headers.authorization?.split(' ')[1];
    if (!token) return { statusCode: 401, body: "Unauthorized" };

    try {
        // Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        
        await client.connect();
        
        // Fetch fresh data
        const result = await client.query(
            'SELECT id, username, credits, inventory FROM users WHERE id = $1', 
            [decoded.userId]
        );
        
        await client.end();

        if (result.rows.length === 0) return { statusCode: 404, body: "User not found" };

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows[0])
        };

    } catch (err) {
        return { statusCode: 401, body: "Invalid Token" };
    }
};