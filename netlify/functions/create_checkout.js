const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: "Login Required" };

  const { type, amount, tier } = JSON.parse(event.body);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: type + " purchase" },
        unit_amount: amount * 100,
      },
      quantity: 1,
    }],
    mode: 'payment',
    metadata: { userId: user.sub, type, tier, creditAmount: amount },
    success_url: process.env.URL + '/?payment=success',
    cancel_url: process.env.URL + '/',
  });

  return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
};
