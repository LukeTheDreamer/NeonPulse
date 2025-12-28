const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { type, tier, amount, userId } = JSON.parse(event.body);
    const line_items = [];
    const metadata = { userId: userId };

    if (type === 'tier') {
      const priceMap = {
        1: process.env.TIER_1_PRICE_ID,
        2: process.env.TIER_2_PRICE_ID,
        3: process.env.TIER_3_PRICE_ID
      };
      if (!priceMap[tier]) throw new Error("Invalid Tier");
      line_items.push({ price: priceMap[tier], quantity: 1 });
      metadata.action = 'supporter_upgrade';
      metadata.tier = tier;
    } else if (type === 'donation') {
      const val = parseFloat(amount);
      if (isNaN(val) || val < 5) throw new Error("Minimum donation is $5");
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Neon Pulse Donation' },
          unit_amount: Math.round(val * 100),
        },
        quantity: 1,
      });
      metadata.action = 'donation';
      metadata.amount_donated = val;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.URL}/?payment=success`,
      cancel_url: `${process.env.URL}/?payment=cancelled`,
      metadata
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
