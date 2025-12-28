const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { type, tier, amount, userId } = data;

    // VALIDATION
    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing User ID" }) };
    }

    let sessionParams = {
      payment_method_types: ['card'],
      success_url: `${event.headers.origin}/?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${event.headers.origin}/?status=cancel`,
      metadata: { userId: userId, type: type }, // This links the payment to the user
      mode: 'payment',
    };

    // LOGIC: Supporter Tier
    if (type === 'tier') {
      let priceId;
      if (tier == 1) priceId = process.env.TIER_1_PRICE_ID;
      else if (tier == 2) priceId = process.env.TIER_2_PRICE_ID;
      else if (tier == 3) priceId = process.env.TIER_3_PRICE_ID;

      if (!priceId) {
        // Fallback for testing if you haven't set env vars yet
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ error: "Price ID not configured in Netlify." }) 
        };
      }

      sessionParams.line_items = [{ price: priceId, quantity: 1 }];
    } 
    // LOGIC: Donation
    else if (type === 'donation') {
      sessionParams.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Neon Pulse Donation' },
          unit_amount: amount * 100, // Convert to cents
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (error) {
    console.error("Stripe Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};