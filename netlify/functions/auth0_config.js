const { normalizeAuth0Domain } = require('../utils/auth0');

exports.handler = async () => {
  const domain = normalizeAuth0Domain(process.env.AUTH0_DOMAIN);
  const clientId = process.env.AUTH0_CLIENT_ID;
  const audience = process.env.AUTH0_AUDIENCE || null;

  if (!domain || !clientId) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error:
          'Auth0 is not configured. Set AUTH0_DOMAIN and AUTH0_CLIENT_ID (and AUTH0_AUDIENCE for API access).',
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify({
      domain,
      clientId,
      audience,
    }),
  };
};

