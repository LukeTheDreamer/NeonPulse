const jwt = require('jsonwebtoken');

let jwksCache = {
  fetchedAtMs: 0,
  keysByKid: new Map(),
};

function normalizeAuth0Domain(value) {
  if (!value) return '';
  return String(value).replace(/^https?:\/\//i, '').replace(/\/+$/g, '');
}

function getAuth0Issuer(domain) {
  return `https://${domain}/`;
}

function chunk64(str) {
  return String(str).match(/.{1,64}/g)?.join('\n') ?? '';
}

function x5cToPem(x5c) {
  if (!x5c) return null;
  return `-----BEGIN CERTIFICATE-----\n${chunk64(x5c)}\n-----END CERTIFICATE-----\n`;
}

async function fetchJwks(domain) {
  const res = await fetch(`https://${domain}/.well-known/jwks.json`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`JWKS fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  if (!json || !Array.isArray(json.keys)) throw new Error('Invalid JWKS response');
  return json.keys;
}

async function getPemForKid({ domain, kid, cacheTtlMs = 6 * 60 * 60 * 1000 }) {
  const now = Date.now();

  if (jwksCache.keysByKid.size > 0 && now - jwksCache.fetchedAtMs < cacheTtlMs) {
    const cached = jwksCache.keysByKid.get(kid);
    if (cached) return cached;
  }

  const keys = await fetchJwks(domain);
  const next = new Map();

  for (const key of keys) {
    if (!key || typeof key !== 'object') continue;
    const keyKid = key.kid;
    const x5c = Array.isArray(key.x5c) ? key.x5c[0] : null;
    const pem = x5cToPem(x5c);
    if (keyKid && pem) next.set(keyKid, pem);
  }

  jwksCache = { fetchedAtMs: now, keysByKid: next };

  const pem = jwksCache.keysByKid.get(kid);
  if (!pem) throw new Error('Signing key not found');
  return pem;
}

function getBearerToken(event) {
  const header = event?.headers?.authorization ?? event?.headers?.Authorization;
  if (!header) return null;
  const [scheme, token] = String(header).split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

async function verifyAuth0Jwt(event) {
  const domain = normalizeAuth0Domain(process.env.AUTH0_DOMAIN);
  const audience = process.env.AUTH0_AUDIENCE || process.env.AUTH0_CLIENT_ID;
  if (!domain || !process.env.AUTH0_CLIENT_ID) {
    const err = new Error('Auth0 is not configured');
    err.statusCode = 500;
    throw err;
  }

  const token = getBearerToken(event);
  if (!token) {
    const err = new Error('Missing Authorization bearer token');
    err.statusCode = 401;
    throw err;
  }

  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.header?.kid;
  if (!kid) {
    const err = new Error('Invalid token header');
    err.statusCode = 401;
    throw err;
  }

  const pem = await getPemForKid({ domain, kid });
  const issuer = getAuth0Issuer(domain);

  try {
    return jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer,
      ...(audience ? { audience } : {}),
    });
  } catch (e) {
    const err = new Error('Invalid token');
    err.statusCode = 401;
    throw err;
  }
}

module.exports = {
  normalizeAuth0Domain,
  getBearerToken,
  verifyAuth0Jwt,
};
