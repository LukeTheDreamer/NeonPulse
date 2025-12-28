const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Client } = require('pg');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const userId = session.client_reference_id;
    const creditAmount = parseInt(session.metadata.creditAmount);

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      await client.query('UPDATE users SET credits = credits + $1 WHERE user_id = $2', [creditAmount, userId]);
      await client.end();
    } catch (err) {
      console.error("DB Update Failed:", err);
    }
  }

  return { statusCode: 200, body: '{"received": true}' };
};