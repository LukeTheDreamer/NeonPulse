const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Client } = require('pg');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let stripeEvent;

  // 1. Verify the event came from Stripe
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // 2. Handle the specific event type
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    
    // Check the "action" metadata we attached in create_checkout.js
    if (session.metadata?.action === 'supporter_upgrade') {
      await fulfillSupporterPerks(session.metadata.userId, parseInt(session.metadata.tier));
    } 
    else if (session.metadata?.action === 'donation') {
      await recordDonation(session.metadata.userId, parseFloat(session.metadata.amount_donated));
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

// --- HELPER: Unlock Perks ---
async function fulfillSupporterPerks(userId, tier) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let intervalStr;
  let skinsToAdd;

  // Define perks based on tier
  switch (tier) {
    case 1: // INITIATE
      intervalStr = "INTERVAL '1 month'";
      skinsToAdd = ['VOID']; 
      break;
    case 2: // VETERAN
      intervalStr = "INTERVAL '1 year'";
      skinsToAdd = ['VOID', 'MATRIX', 'GOLD']; 
      break;
    case 3: // LEGEND
      intervalStr = "INTERVAL '100 years'"; // Lifetime
      skinsToAdd = ['VOID', 'MATRIX', 'GOLD', 'NEON_GOD']; 
      break;
    default:
      return;
  }

  try {
    console.log(`Upgrading User ${userId} to Tier ${tier}`);
    
    const query = `
      UPDATE users 
      SET 
        supporter_tier = GREATEST(supporter_tier, $1),
        -- Add time to existing expiry, or start from now
        ad_free_until = CASE 
          WHEN ad_free_until > NOW() THEN ad_free_until + ${intervalStr}
          ELSE NOW() + ${intervalStr}
        END,
        -- Merge new skins with existing ones (avoid duplicates)
        unlocked_skins = (
          SELECT array_agg(DISTINCT e) 
          FROM unnest(unlocked_skins || $2::text[]) AS e
        )
      WHERE id = $3
    `;
    
    await client.query(query, [tier, skinsToAdd, userId]);
  } catch (err) {
    console.error('Database update failed:', err);
  } finally {
    await client.end();
  }
}

// --- HELPER: Record Donation ---
async function recordDonation(userId, amount) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log(`User ${userId} donated $${amount}`);
    // Assuming you have a total_donated column. If not, this query handles it gracefully
    // by checking if the column exists or simply logging it if you don't track totals.
    const query = `
      UPDATE users 
      SET total_donated = COALESCE(total_donated, 0) + $1 
      WHERE id = $2
    `;
    await client.query(query, [amount, userId]);
  } catch (err) {
    console.error('Donation record failed (ignore if column missing):', err.message);
  } finally {
    await client.end();
  }
}