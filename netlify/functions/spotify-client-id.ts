import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Get origin from request or use production URL
  const origin = event.headers.origin || process.env.URL || 'https://yume-app.netlify.app';

  // CORS headers - only allow requests from our domain
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check if client ID is configured
  if (!SPOTIFY_CLIENT_ID) {
    console.error('SPOTIFY_CLIENT_ID environment variable not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Spotify client ID not configured' }),
    };
  }

  // Return client ID (this is public information, not a secret)
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      client_id: SPOTIFY_CLIENT_ID,
    }),
  };
};
