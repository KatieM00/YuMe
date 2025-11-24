// TMDB API Service
// API Documentation: https://developer.themoviedb.org/docs
// NOTE: API calls should be proxied through Netlify Functions to keep API key secure
// See WATCHING_SETUP.md for setup instructions

const TMDB_PROXY_URL = '/.netlify/functions/tmdb'; // Update this to your proxy endpoint
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  runtime?: number;
  genres?: { id: number; name: string }[];
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  genres?: { id: number; name: string }[];
}

export interface SearchResult {
  id: number;
  title?: string; // for movies
  name?: string; // for TV shows
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  release_date?: string; // for movies
  first_air_date?: string; // for TV shows
  overview: string;
  vote_average: number;
}

/**
 * Get poster image URL
 */
export function getPosterUrl(posterPath: string | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342'): string {
  if (!posterPath) {
    return '/placeholder-poster.png'; // You can add a placeholder image
  }
  return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`;
}

/**
 * Get backdrop image URL
 */
export function getBackdropUrl(backdropPath: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280'): string {
  if (!backdropPath) {
    return '/placeholder-backdrop.png';
  }
  return `${TMDB_IMAGE_BASE_URL}/${size}${backdropPath}`;
}

/**
 * Search for movies and TV shows
 */
export async function searchMulti(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    const response = await fetch(
      `${TMDB_PROXY_URL}?endpoint=search/multi&query=${encodeURIComponent(query)}&page=1`
    );

    if (!response.ok) {
      throw new Error('Failed to search TMDB');
    }

    const data = await response.json();

    // Filter to only movies and TV shows
    return data.results.filter((item: any) =>
      item.media_type === 'movie' || item.media_type === 'tv'
    ).slice(0, 10); // Limit to 10 results
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

/**
 * Get movie details
 */
export async function getMovieDetails(movieId: number): Promise<TMDBMovie | null> {
  try {
    const response = await fetch(
      `${TMDB_PROXY_URL}?endpoint=movie/${movieId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch movie details');
    }

    return await response.json();
  } catch (error) {
    console.error('TMDB movie details error:', error);
    return null;
  }
}

/**
 * Get TV show details
 */
export async function getTVShowDetails(tvId: number): Promise<TMDBTVShow | null> {
  try {
    const response = await fetch(
      `${TMDB_PROXY_URL}?endpoint=tv/${tvId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch TV show details');
    }

    return await response.json();
  } catch (error) {
    console.error('TMDB TV show details error:', error);
    return null;
  }
}

/**
 * Get genre name from ID
 */
const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // TV genres
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export function getGenreName(genreId: number): string {
  return GENRE_MAP[genreId] || 'Unknown';
}

export function getGenreNames(genreIds: number[]): string[] {
  return genreIds.map(id => getGenreName(id)).filter(name => name !== 'Unknown');
}
