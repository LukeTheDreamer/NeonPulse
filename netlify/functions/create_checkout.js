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
  const host = event?.headers?.host || event?.headers?.Host;
  if (!host) return null;
  return `${proto}://${host}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return json(500, { error: 'Stripe is not configured' });

  let decoded;
  try {
    decoded = await verifyAuth0Jwt(event);
  } catch (e) {
    return json(e?.statusCode || 401, { error: 'Unauthorized' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Invalid JSON body' });
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

  const stripe = Stripe(stripeSecretKey);

  try {
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
  } catch (_) {
    return json(500, { error: 'Server Error' });
  }
};

