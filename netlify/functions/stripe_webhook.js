const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { neon } = require('@neondatabase/serverless');

/**
 * STRIPE WEBHOOK HANDLER
 * Listens for 'checkout.session.completed' to fulfill orders.
 */
exports.handler = async (event) => {
    const sig = event.headers['stripe-signature'];
    const sql = neon(process.env.DATABASE_URL);

    let stripeEvent;

    try {
        // 1. Verify the event came from Stripe
        // Requires STRIPE_WEBHOOK_SECRET from your Stripe CLI/Dashboard
        stripeEvent = stripe.webhooks.constructEvent(
            event.body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // 2. Handle the "Payment Successful" event
    if (stripeEvent.type === 'checkout.session.completed') {
        const session = stripeEvent.data.object;
        const userEmail = session.customer_details.email;
        const priceId = session.metadata.item_purchased;

        console.log(`>> Fulfilling order for: ${userEmail} (Item: ${priceId})`);

        try {
            // 3. Logic to determine what was bought
            // You can map your Stripe Price IDs to DB values here
            let creditIncrease = 0;
            let newTier = 'guest';

            if (priceId === 'price_credits_500') {
                creditIncrease = 500;
            } else if (priceId === 'price_ads_free') {
                newTier = 'premium';
            }

            // 4. Update Neon DB
            // We use an "UPSERT" pattern (Update or Insert)
            await sql`
                INSERT INTO users (email, credits, tier) 
                VALUES (${userEmail}, ${creditIncrease}, ${newTier})
                ON CONFLICT (email) 
                DO UPDATE SET 
                    credits = users.credits + ${creditIncrease},
                    tier = CASE WHEN ${newTier} = 'premium' THEN 'premium' ELSE users.tier END
            `;

            return { statusCode: 200, body: JSON.stringify({ received: true }) };

        } catch (dbErr) {
            console.error("Database Update Failed:", dbErr);
            return { statusCode: 500, body: "Database Error" };
        }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};