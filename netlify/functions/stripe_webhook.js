const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Client } = require('pg');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) { return { statusCode: 400, body: "Error" }; }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const { userId, type, tier, creditAmount } = session.metadata;
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
    await client.connect();
    if (type === 'credits') {
      await client.query('UPDATE users SET credits = credits +  WHERE user_id = ', [parseInt(creditAmount), userId]);
    } else if (type === 'tier') {
      await client.query('UPDATE users SET supporter_tier = , ad_free = true WHERE user_id = ', [parseInt(tier), userId]);
    }
    await client.end();
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
