import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // Check if API key is configured
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY environment variable not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'TMDB API key not configured' }),
    };
  }

  const { endpoint, ...queryParams } = event.queryStringParameters || {};

  if (!endpoint) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Endpoint parameter required' }),
    };
  }

  try {
    // Build query string
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      ...queryParams,
    });

    // Fetch from TMDB
    const tmdbUrl = `${TMDB_BASE_URL}/${endpoint}?${params}`;
    console.log('Fetching from TMDB:', tmdbUrl.replace(TMDB_API_KEY, 'HIDDEN'));

    const response = await fetch(tmdbUrl);

    if (!response.ok) {
      throw new Error(`TMDB API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('TMDB API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch from TMDB',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
