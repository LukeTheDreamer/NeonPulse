const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * STRIPE CHECKOUT GENERATOR
 * Triggered when a user selects a credit pack or upgrade.
 */
exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { priceId } = JSON.parse(event.body);

        // 1. Validate Input
        if (!priceId) {
            return { statusCode: 400, body: JSON.stringify({ error: "No Price ID provided." }) };
        }

        // 2. Create Stripe Checkout Session
        // We use 'payment' mode for one-time credit top-ups
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // Redirect back to the Hub after success/cancel
            success_url: `${process.env.URL}/index.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL}/index.html`,
            
            // Metadata is key! 
            // It carries the info we need for our database into the next step.
            metadata: {
                item_purchased: priceId
            }
        });

        // 3. Send the session URL back to app.js
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: session.url }),
        };

    } catch (error) {
        console.error("Stripe Session Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Neural Link to Stripe interrupted." }),
        };
    }
};