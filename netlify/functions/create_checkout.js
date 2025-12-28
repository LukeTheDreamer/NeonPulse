const Stripe = require('stripe');
const { verifyAuth0Jwt } = require('../utils/auth0');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}

function getSiteUrl(event) {
  const proto = event?.headers?.['x-forwarded-proto'] || event?.headers?.['X-Forwarded-Proto'] || 'https';
  const host = event?.headers?.host || event?.headers?.Host || process.env.URL;
  if (!host) return null;
  // If host already contains scheme (from env), keep it; otherwise join proto and host
  if (/^https?:\/\//i.test(host)) return host.replace(/\/$/, '');
  return `${proto}://${host}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return json(500, { error: 'Stripe is not configured' });

  const stripe = Stripe(stripeSecretKey);

  // Try to parse body safely
  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return json(400, { error: 'Invalid JSON body' });
  }

  // Support two modes: item purchases (from store) and supporter tiers / donation
  // If payload.itemName is provided, require Auth0 token and map to a price env var
  try {
    // ITEM PURCHASE flow (requires Auth0)
    if (payload.itemName) {
      let decoded;
      try {
        decoded = await verifyAuth0Jwt(event);
      } catch (e) {
        return json(e?.statusCode || 401, { error: 'Unauthorized' });
      }

      const itemName = String(payload.itemName || '').trim();
      const itemToEnvVar = {
        credits_5000: 'STRIPE_PRICE_CREDITS_5000',
        golden_skin: 'STRIPE_PRICE_GOLDEN_SKIN',
        supporter_badge: 'STRIPE_PRICE_SUPPORTER_BADGE',
      };

      const priceEnvVar = itemToEnvVar[itemName];
      if (!priceEnvVar) return json(400, { error: 'Unknown item' });

      const priceId = process.env[priceEnvVar];
      if (!priceId) return json(500, { error: `Missing ${priceEnvVar}` });

      const siteUrl = getSiteUrl(event);
      if (!siteUrl) return json(500, { error: 'Unable to determine site URL' });

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${siteUrl}/?success=true&item=${encodeURIComponent(itemName)}`,
        cancel_url: `${siteUrl}/?canceled=true`,
        client_reference_id: decoded?.sub || undefined,
        metadata: {
          item: itemName,
          auth0_sub: decoded?.sub || '',
        },
      });

      return json(200, { url: session.url });
    }

    // TIER / DONATION flow (open or optionally authenticated)
    if (!payload.type) return json(400, { error: 'Missing type (tier|donation)' });

    const type = String(payload.type);
    const metadata = { userId: payload.userId || null };
    const line_items = [];

    if (type === 'tier') {
      const tier = parseInt(payload.tier, 10);
      const priceMap = {
        1: process.env.TIER_1_PRICE_ID,
        2: process.env.TIER_2_PRICE_ID,
        3: process.env.TIER_3_PRICE_ID,
      };
      if (!priceMap[tier]) return json(400, { error: 'Invalid tier' });
      const priceId = priceMap[tier];
      line_items.push({ price: priceId, quantity: 1 });
      metadata.action = 'supporter_upgrade';
      metadata.tier = String(tier);
    } else if (type === 'donation') {
      const val = parseFloat(payload.amount);
      const minDonation = parseFloat(process.env.MIN_DONATION || '5');
      if (isNaN(val) || val < minDonation) return json(400, { error: `Minimum donation is $${minDonation}` });
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Neon Pulse Donation' },
          unit_amount: Math.round(val * 100),
        },
        quantity: 1,
      });
      metadata.action = 'donation';
      metadata.amount_donated = String(val);
    } else {
      return json(400, { error: 'Unknown type' });
    }

    const siteUrl = getSiteUrl(event);
    if (!siteUrl) return json(500, { error: 'Unable to determine site URL' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${siteUrl}/?payment=success`,
      cancel_url: `${siteUrl}/?payment=cancelled`,
      metadata,
    });

    return json(200, { url: session.url });
  } catch (err) {
    console.error('create_checkout error:', err?.message || err);
    return json(500, { error: 'Server Error' });
  }
};

