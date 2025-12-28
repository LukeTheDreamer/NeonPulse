exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    return {
        statusCode: 410,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            error: 'Direct registration has been disabled. Use Auth0 Universal Login (signup) instead.'
        })
    };
};
