const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Client } = require('pg');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  // 1. Verify that the request actually came from Stripe
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Signature Verification Failed: ${err.message}`);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // 2. Handle the 'checkout.session.completed' event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    
    // Extract our custom data from the metadata we sent in create_checkout.js
    const { userId, type, tier, creditAmount } = session.metadata;

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();

      // --- LOGIC A: CREDIT PACKS ---
      if (type === 'credits') {
        const amountToAdd = parseInt(creditAmount);
        await client.query(
          'UPDATE users SET credits = credits + $1 WHERE user_id = $2',
          [amountToAdd, userId]
        );
        console.log(`Success: Added ${amountToAdd} credits to user ${userId}`);
      } 

      // --- LOGIC B: SUPPORTER TIERS ---
      else if (type === 'tier') {
        const tierLevel = parseInt(tier);
        // Tiers automatically grant Ad-Free status
        await client.query(
          'UPDATE users SET supporter_tier = $1, ad_free = true WHERE user_id = $2',
          [tierLevel, userId]
        );
        console.log(`Success: Set tier ${tierLevel} for user ${userId}`);
      }

      // --- LOGIC C: DIRECT DONATIONS ---
      else if (type === 'donation') {
        // $1.00 = 1000 Credits reward for donations
        const rewardCredits = (session.amount_total / 100) * 1000;
        await client.query(
          'UPDATE users SET credits = credits + $1 WHERE user_id = $2',
          [rewardCredits, userId]
        );
        console.log(`Success: Processed donation reward for user ${userId}`);
      }

      await client.end();
    } catch (dbErr) {
      console.error('Database Update Error:', dbErr);
      if (client) await client.end();
      // We return a 500 so Stripe knows to retry the webhook later
      return { statusCode: 500, body: "Database sync failed." };
    }
  }

  // 3. Return a 200 to Stripe to acknowledge receipt
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};