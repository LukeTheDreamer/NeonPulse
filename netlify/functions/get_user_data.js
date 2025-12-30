const { neon } = require('@neondatabase/serverless');

/**
 * NEON DB - USER DATA FETCH
 * This function retrieves the player's profile based on their identity.
 */
exports.handler = async (event, context) => {
    // 1. Initialize Neon Connection
    // You must set DATABASE_URL in your Netlify Environment Variables
    const sql = neon(process.env.DATABASE_URL);

    try {
        // 2. Identify the User
        // In a production app, you would get this from 'context.clientContext.user'
        // For this implementation, we'll simulate a lookup or use a test ID.
        const userEmail = context.clientContext?.user?.email || "guest@neural-link.io";

        // 3. Query the Database
        // We use a safe template literal provided by the Neon driver
        const result = await sql`
            SELECT credits, tier, ad_free 
            FROM users 
            WHERE email = ${userEmail} 
            LIMIT 1
        `;

        // 4. Handle New Users
        if (result.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    credits: 0.00,
                    tier: "guest",
                    ad_free: false,
                    message: "New user profile initialized in memory."
                })
            };
        }

        // 5. Return Data to Frontend
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result[0])
        };

    } catch (error) {
        console.error("Neon DB Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not establish Neural Link with database." })
        };
    }
};