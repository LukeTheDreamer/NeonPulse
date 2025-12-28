const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getSql } = require('../utils/db');

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  // Use raw body for signature verification
  const payload = event.body;
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return json(500, { error: 'Webhook not configured' });
  }

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return json(400, { error: `Webhook Error: ${err.message}` });
  }

  // Only handle checkout.session.completed for now, idempotently
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const sessionId = session.id;
    const eventId = stripeEvent.id;

    try {
      const sql = getSql();
      let wasIdempotent = false;

      await sql.transaction(async (tx) => {
        // Attempt to insert payment record - unique constraint on stripe_session_id prevents duplicates
        const inserted = await tx(
          `INSERT INTO payments (stripe_session_id, stripe_event_id, user_id, amount, metadata)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (stripe_session_id) DO NOTHING
           RETURNING id`,
          [sessionId, eventId, null, session.amount_total || null, session.metadata ? JSON.stringify(session.metadata) : null],
        );

        if (!inserted || inserted.length === 0) {
          wasIdempotent = true;
          return;
        }

        // Process metadata actions
        const meta = session.metadata || {};
        if (meta.action === 'supporter_upgrade') {
          await fulfillSupporterPerks(tx, meta.userId, parseInt(meta.tier));
        } else if (meta.action === 'donation') {
          await recordDonation(tx, meta.userId, parseFloat(meta.amount_donated));
        } else if (meta.item) {
          // Optional: grant in-game items (store purchases)
          await grantStoreItem(tx, meta.auth0_sub || null, meta.item);
        }
      });

      if (wasIdempotent) {
        console.log(`Session ${sessionId} already processed; ignoring`);
        return json(200, { received: true, idempotent: true });
      }

      return json(200, { received: true });
    } catch (err) {
      console.error('Webhook processing failed:', err);
      return json(500, { error: 'Processing Error' });
    }
  }

  // For other event types, respond 200
  return json(200, { received: true });
};

// --- HELPER: Unlock Perks (uses provided client) ---
async function fulfillSupporterPerks(client, userId, tier) {
  if (!userId) {
    console.warn('No userId provided for supporter upgrade');
    return;
  }

  let intervalStr;
  let skinsToAdd;

  switch (tier) {
    case 1:
      intervalStr = "INTERVAL '1 month'";
      skinsToAdd = ['VOID'];
      break;
    case 2:
      intervalStr = "INTERVAL '1 year'";
      skinsToAdd = ['VOID', 'MATRIX', 'GOLD'];
      break;
    case 3:
      intervalStr = "INTERVAL '100 years'";
      skinsToAdd = ['VOID', 'MATRIX', 'GOLD', 'NEON_GOD'];
      break;
    default:
      return;
  }

  try {
    await client(`
      UPDATE users
      SET
        supporter_tier = GREATEST(supporter_tier, $1),
        ad_free_until = CASE WHEN ad_free_until > NOW() THEN ad_free_until + ${intervalStr} ELSE NOW() + ${intervalStr} END,
        unlocked_skins = (SELECT array_agg(DISTINCT e) FROM unnest(unlocked_skins || $2::text[]) AS e)
      WHERE id = $3
    `, [tier, skinsToAdd, userId]);
  } catch (err) {
    console.error('fulfillSupporterPerks error:', err.message || err);
  }
}

// --- HELPER: Record Donation (uses provided client) ---
async function recordDonation(client, userId, amount) {
  if (!userId) {
    console.warn('No userId provided for donation');
    return;
  }
  try {
    await client(`UPDATE users SET total_donated = COALESCE(total_donated, 0) + $1 WHERE id = $2`, [amount, userId]);
  } catch (err) {
    console.error('recordDonation error:', err.message || err);
  }
}

// --- HELPER: Grant Store Item (simple placeholder) ---
async function grantStoreItem(client, auth0_sub, itemName) {
  if (!auth0_sub) return;
  try {
    console.log(`Granting item ${itemName} to ${auth0_sub}`);
    // You can implement actual granting logic here, e.g. crediting an account.
    await client(`UPDATE users SET credits = credits + $1 WHERE auth0_sub = $2`, [ itemName === 'credits_5000' ? 5000 : 0, auth0_sub ]);
  } catch (err) {
    console.error('grantStoreItem error:', err.message || err);
  }
}
