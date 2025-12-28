const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { type, amount, userId } = JSON.parse(event.body);

  const packs = { 5000: 500, 15000: 1200, 50000: 3500 };
  const unitAmount = packs[amount];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `${amount.toLocaleString()} Credits Injection` },
        unit_amount: unitAmount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    client_reference_id: userId,
    metadata: { creditAmount: amount.toString() },
    success_url: `${process.env.URL}/?payment=success`,
    cancel_url: `${process.env.URL}/`,
  });

  return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
};