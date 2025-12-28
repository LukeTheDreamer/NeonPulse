const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: "Login Required" };

  try {
    const { type, amount, tier, userId } = JSON.parse(event.body);
    let unitAmount = 0;
    let productName = "";
    let metadata = { userId: user.sub, type: type };

    // --- LOGIC A: CREDIT PACKS ---
    if (type === 'credits') {
      const packs = { 5000: 500, 15000: 1200, 50000: 3500 };
      unitAmount = packs[amount];
      productName = `${amount.toLocaleString()} NEON CREDITS`;
      metadata.creditAmount = amount.toString();
    } 

    // --- LOGIC B: SUPPORTER TIERS ---
    else if (type === 'tier') {
      const tiers = {
        1: { name: "Supporter Tier 1", price: 3000 },  // $30
        2: { name: "Supporter Tier 2", price: 9000 },  // $90
        3: { name: "Supporter Tier 3", price: 50000 }  // $500
      };
      unitAmount = tiers[tier].price;
      productName = tiers[tier].name;
      metadata.tier = tier.toString();
    }

    // --- LOGIC C: DIRECT DONATIONS ---
    else if (type === 'donation') {
      unitAmount = amount * 100; // amount is the $ value from input
      productName = "DIRECT DONATION";
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: productName },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      client_reference_id: user.sub,
      metadata: metadata,
      success_url: `${process.env.URL}/?payment=success`,
      cancel_url: `${process.env.URL}/`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};