import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Get origin from request or use production URL
  const origin = event.headers.origin || process.env.URL || 'https://yume-app.netlify.app';

  // CORS headers - only allow requests from our domain
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  // Check if required environment variables are set
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing required environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  const { user_id, endpoint, method = 'GET', body: requestBody, ...queryParams } =
    event.httpMethod === 'GET'
      ? event.queryStringParameters || {}
      : { ...event.queryStringParameters, ...(JSON.parse(event.body || '{}')) };

  if (!user_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'user_id parameter required' }),
    };
  }

  if (!endpoint) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'endpoint parameter required' }),
    };
  }

  try {
    // Get access token for user
    const tokenResponse = await fetch(`${SUPABASE_URL}/rest/v1/spotify_tokens?user_id=eq.${user_id}&select=access_token,expires_at,refresh_token`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!tokenResponse.ok) {
      console.error('Error fetching token');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No Spotify account connected' }),
      };
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData || tokenData.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No Spotify account connected' }),
      };
    }

    let accessToken = tokenData[0].access_token;
    const expiresAt = tokenData[0].expires_at;
    const refreshToken = tokenData[0].refresh_token;

    // Check if token is expired or about to expire (within 5 minutes)
    if (expiresAt < Date.now() + (5 * 60 * 1000)) {
      console.log('Token expired or about to expire, refreshing...');

      // Refresh the token
      const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json();
        console.error('Token refresh failed:', errorData);

        if (errorData.error === 'invalid_grant') {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              error: 'Spotify connection expired',
              reconnect_required: true
            }),
          };
        }

        throw new Error('Failed to refresh token');
      }

      const newTokenData = await refreshResponse.json();
      accessToken = newTokenData.access_token;

      // Update token in database
      const newExpiresAt = Date.now() + (newTokenData.expires_in * 1000);
      await fetch(`${SUPABASE_URL}/rest/v1/spotify_tokens?user_id=eq.${user_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: newTokenData.refresh_token || refreshToken,
          expires_at: newExpiresAt,
        }),
      });
    }

    // Build Spotify API URL
    const url = new URL(`${SPOTIFY_BASE_URL}/${endpoint}`);

    // Add query parameters (excluding our internal params)
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== 'user_id' && key !== 'endpoint' && key !== 'method' && key !== 'body' && value) {
        url.searchParams.append(key, String(value));
      }
    });

    // Make request to Spotify API
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    // Add body for POST, PUT, DELETE requests
    if (requestBody && ['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
      fetchOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    }

    console.log(`Making ${method} request to Spotify:`, url.pathname);

    const spotifyResponse = await fetch(url.toString(), fetchOptions);

    // Handle empty responses (like 204 No Content)
    if (spotifyResponse.status === 204) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    if (!spotifyResponse.ok) {
      const errorData = await spotifyResponse.json().catch(() => ({}));
      console.error('Spotify API error:', spotifyResponse.status, errorData);

      return {
        statusCode: spotifyResponse.status,
        headers,
        body: JSON.stringify({
          error: 'Spotify API request failed',
          status: spotifyResponse.status,
          details: errorData,
        }),
      };
    }

    const data = await spotifyResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Spotify API proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch from Spotify API',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
