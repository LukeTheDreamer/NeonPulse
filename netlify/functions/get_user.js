const { verifyAuth0Jwt } = require('../utils/auth0');
const { getSql } = require('../utils/db');

exports.handler = async (event) => {
    try {
        const decoded = await verifyAuth0Jwt(event);
        const sql = getSql();
        const auth0Sub = decoded?.sub;
        if (!auth0Sub) {
            return { statusCode: 401, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: "Invalid token" }) };
        }

        let body = {};
        try {
            body = event.body ? JSON.parse(event.body) : {};
        } catch {
            body = {};
        }

        const email = body.email || null;
        const requestedUsername = body.username || body.nickname || null;

        const existingRows = await sql(
            'SELECT id, username, credits, inventory FROM users WHERE auth0_sub = $1',
            [auth0Sub]
        );

        if (existingRows.length > 0) {
            return {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(existingRows[0])
            };
        }

        if (!email) {
            return {
                statusCode: 400,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ error: 'Missing email for first-time user provisioning' })
            };
        }

        const baseUsername = String(requestedUsername || email.split('@')[0] || 'user')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '')
            .slice(0, 30) || 'user';

        let inserted = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const suffix = attempt === 0 ? '' : `-${Math.random().toString(16).slice(2, 6)}`;
            const username = `${baseUsername}${suffix}`.slice(0, 50);

            try {
                const rows = await sql(
                    `INSERT INTO users (auth0_sub, username, email, credits, inventory)
                     VALUES ($1, $2, $3, 1000, '["NEON"]'::jsonb)
                     RETURNING id, username, credits, inventory`,
                    [auth0Sub, username, email]
                );
                inserted = rows[0];
                break;
            } catch (e) {
                // Unique constraint collision; retry with suffix.
                if (!String(e?.code) || String(e.code) !== '23505') throw e;
                }
        }

        if (!inserted) {
            return {
                statusCode: 409,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ error: 'Unable to provision user (conflict)' })
            };
        }

        return {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(inserted)
        };

    } catch (err) {
        const statusCode = err?.statusCode || 500;
        return {
            statusCode,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ error: statusCode === 401 ? 'Unauthorized' : 'Server Error' })
        };
    } finally {
        // No-op: @netlify/neon manages connections internally.
    }
};
