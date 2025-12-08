import { useState, useEffect, useRef } from 'react';
import { Plus, Search, X, Star, Clock, Calendar, Film, Tv, Loader } from 'lucide-react';
import UserBadge from '../components/UserBadge';
import {
  searchMulti,
  getMovieDetails,
  getTVShowDetails,
  getPosterUrl,
  getGenreNames,
  SearchResult,
  TMDBMovie,
  TMDBTVShow,
} from '../lib/tmdbService';
import {
  WatchingItem,
  getAllWatchingItems,
  addWatchingItem,
  updateUserRating,
  updateWatchingStatus,
  deleteWatchingItem,
} from '../lib/watchingService';

export default function Watching() {
  const [items, setItems] = useState<WatchingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search states
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Detail modal states
  const [selectedItem, setSelectedItem] = useState<WatchingItem | null>(null);

  // Load watching items
  const loadWatchingItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllWatchingItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watching items');
      console.error('Failed to load watching items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWatchingItems();
  }, []);

  // Search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await searchMulti(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Add item to watching list
  const handleAddItem = async (result: SearchResult, status: 'watching' | 'want_to_watch' | 'watched') => {
    try {
      const mediaType = result.media_type;
      let itemData: Omit<WatchingItem, 'id' | 'created_at' | 'updated_at'>;

      if (mediaType === 'movie') {
        const details = await getMovieDetails(result.id);
        if (!details) throw new Error('Failed to fetch movie details');

        itemData = {
          tmdb_id: result.id,
          media_type: 'movie',
          title: details.title,
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          overview: details.overview,
          release_date: details.release_date,
          runtime: details.runtime || null,
          genres: details.genres?.map(g => g.name) || getGenreNames(details.genre_ids || []),
          seasons: null,
          episodes: null,
          tmdb_rating: Math.round(details.vote_average * 10) / 10,
          user_rating: null,
          status,
        };
      } else {
        const details = await getTVShowDetails(result.id);
        if (!details) throw new Error('Failed to fetch TV show details');

        const avgRuntime = details.episode_run_time && details.episode_run_time.length > 0
          ? Math.round(details.episode_run_time.reduce((a, b) => a + b, 0) / details.episode_run_time.length)
          : null;

        itemData = {
          tmdb_id: result.id,
          media_type: 'tv',
          title: details.name,
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          overview: details.overview,
          release_date: details.first_air_date,
          runtime: avgRuntime,
          genres: details.genres?.map(g => g.name) || getGenreNames(details.genre_ids || []),
          seasons: details.number_of_seasons || null,
          episodes: details.number_of_episodes || null,
          tmdb_rating: Math.round(details.vote_average * 10) / 10,
          user_rating: null,
          status,
        };
      }

      await addWatchingItem(itemData);
      await loadWatchingItems();

      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
    } catch (err) {
      console.error('Failed to add item:', err);
      alert(err instanceof Error ? err.message : 'Failed to add item');
    }
  };

  // Update rating
  const handleUpdateRating = async (id: string, rating: number) => {
    try {
      await updateUserRating(id, rating);
      await loadWatchingItems();
      if (selectedItem?.id === id) {
        setSelectedItem({ ...selectedItem, user_rating: rating });
      }
    } catch (err) {
      console.error('Failed to update rating:', err);
      alert('Failed to update rating');
    }
  };

  // Update status
  const handleUpdateStatus = async (id: string, status: 'watching' | 'want_to_watch' | 'watched') => {
    try {
      await updateWatchingStatus(id, status);
      await loadWatchingItems();
      if (selectedItem?.id === id) {
        setSelectedItem({ ...selectedItem, status });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    if (!confirm('Remove this from your watching list?')) return;

    try {
      await deleteWatchingItem(id);
      await loadWatchingItems();
      setSelectedItem(null);
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Failed to delete item');
    }
  };

  // Format runtime
  const formatRuntime = (minutes: number | null): string => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get display rating (user rating or TMDB rating)
  const getDisplayRating = (item: WatchingItem): { rating: number; source: 'user' | 'tmdb' } => {
    if (item.user_rating !== null && item.user_rating > 0) {
      return { rating: item.user_rating, source: 'user' };
    }
    // Convert TMDB 10-point scale to 5-point scale
    return { rating: Math.round((item.tmdb_rating / 10) * 5 * 10) / 10, source: 'tmdb' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-400">Loading your watching list...</p>
        </div>
      </div>
    );
  }

  const watchingItems = items.filter((item) => item.status === 'watching');
  const wantToWatchItems = items.filter((item) => item.status === 'want_to_watch');
  const watchedItems = items.filter((item) => item.status === 'watched');

  return (
    <div className="min-h-screen p-4 md:p-8 pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-10">
          {/* Currently Watching */}
          {watchingItems.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Currently Watching</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {watchingItems.map((item) => (
                  <WatchingCard
                    key={item.id}
                    item={item}
                    onSelect={setSelectedItem}
                    getDisplayRating={getDisplayRating}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Want to Watch */}
          {wantToWatchItems.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Want to Watch</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {wantToWatchItems.map((item) => (
                  <WatchingCard
                    key={item.id}
                    item={item}
                    onSelect={setSelectedItem}
                    getDisplayRating={getDisplayRating}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Have Watched */}
          {watchedItems.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Have Watched</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {watchedItems.map((item) => (
                  <WatchingCard
                    key={item.id}
                    item={item}
                    onSelect={setSelectedItem}
                    getDisplayRating={getDisplayRating}
                  />
                ))}
              </div>
            </section>
          )}

          {items.length === 0 && (
            <div className="text-center py-16">
              <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No items in your watching list yet</p>
              <p className="text-gray-500 text-sm">Click "Add" to start tracking movies and series</p>
            </div>
          )}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Add Movie or Series</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }}
                    className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for movies or TV series..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* Search Results */}
              <div className="max-h-[60vh] overflow-y-auto p-4">
                {showSearchResults && searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <SearchResultItem
                        key={`${result.media_type}-${result.id}`}
                        result={result}
                        onAdd={handleAddItem}
                      />
                    ))}
                  </div>
                ) : showSearchResults && searchResults.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No results found</p>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Start typing to search for movies and TV series
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedItem && (
          <DetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdateRating={handleUpdateRating}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteItem}
            formatRuntime={formatRuntime}
            formatDate={formatDate}
            getDisplayRating={getDisplayRating}
          />
        )}

        {/* TMDB Attribution */}
        <div className="mt-12 pt-6 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <img
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
              alt="TMDB Logo"
              className="h-5"
            />
            <p className="text-gray-500 text-xs max-w-2xl">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// Watching Card Component
function WatchingCard({
  item,
  onSelect,
  getDisplayRating,
}: {
  item: WatchingItem;
  onSelect: (item: WatchingItem) => void;
  getDisplayRating: (item: WatchingItem) => { rating: number; source: 'user' | 'tmdb' };
}) {
  const displayRating = getDisplayRating(item);
  const fullStars = Math.floor(displayRating.rating);

  return (
    <div
      className="group cursor-pointer relative"
      onClick={() => onSelect(item)}
    >
      <div className="aspect-[2/3] rounded-lg overflow-hidden relative shadow-lg group-hover:shadow-2xl transition-all duration-300">
        {item.poster_path ? (
          <img
            src={getPosterUrl(item.poster_path, 'w342')}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            {item.media_type === 'movie' ? (
              <Film className="w-12 h-12 text-gray-500" />
            ) : (
              <Tv className="w-12 h-12 text-gray-500" />
            )}
          </div>
        )}

        {/* Type Badge - Top Right */}
        <div className={`absolute top-2 right-2 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold ${
          item.media_type === 'movie'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          {item.media_type === 'movie' ? 'MOVIE' : 'SERIES'}
        </div>

        {/* Rating Badge - Bottom Left */}
        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded flex items-center space-x-1">
          {Array.from({ length: fullStars }).map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${
                displayRating.source === 'user'
                  ? 'text-orange-400 fill-orange-400'
                  : 'text-yellow-400 fill-yellow-400'
              }`}
            />
          ))}
          <span className={`text-xs font-medium ${
            displayRating.source === 'user' ? 'text-orange-400' : 'text-yellow-400'
          }`}>
            {displayRating.rating.toFixed(1)}
          </span>
        </div>

        {/* User Badge - Bottom Right */}
        <div className="absolute bottom-2 right-2">
          <UserBadge userId={item.user_id} size={20} />
        </div>

        {/* Hover Overlay - Similar to Album page */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition text-white text-center p-4">
            <p className="text-sm font-bold mb-2">{item.title}</p>
            <p className="text-xs text-gray-300 mb-1">
              {item.media_type === 'movie' ? 'Movie' : 'Series'}
            </p>
            {item.runtime && (
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Clock className="w-3 h-3" />
                <p className="text-xs">
                  {item.media_type === 'tv'
                    ? `${item.runtime}m/ep`
                    : (() => {
                        const hours = Math.floor(item.runtime / 60);
                        const mins = item.runtime % 60;
                        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                      })()
                  }
                </p>
              </div>
            )}
            {item.genres.length > 0 && (
              <p className="text-xs text-gray-300 mb-1">{item.genres.slice(0, 2).join(', ')}</p>
            )}
            {item.release_date && (
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="w-3 h-3" />
                <p className="text-xs text-gray-300">
                  {new Date(item.release_date).getFullYear()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Search Result Item Component
function SearchResultItem({
  result,
  onAdd,
}: {
  result: SearchResult;
  onAdd: (result: SearchResult, status: 'watching' | 'want_to_watch' | 'watched') => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const title = result.title || result.name || 'Unknown';
  const releaseDate = result.release_date || result.first_air_date;

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-900/50 hover:bg-gray-900 rounded-lg transition">
      <div className="w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-800">
        {result.poster_path ? (
          <img
            src={getPosterUrl(result.poster_path, 'w185')}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {result.media_type === 'movie' ? (
              <Film className="w-6 h-6 text-gray-600" />
            ) : (
              <Tv className="w-6 h-6 text-gray-600" />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium truncate">{title}</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
            {result.media_type === 'movie' ? 'Movie' : 'Series'}
          </span>
          {releaseDate && (
            <span>{new Date(releaseDate).getFullYear()}</span>
          )}
        </div>
      </div>

      {!showActions ? (
        <button
          onClick={() => setShowActions(true)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
        >
          Add
        </button>
      ) : (
        <div className="flex space-x-2">
          <button
            onClick={() => onAdd(result, 'watching')}
            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition"
          >
            Watching
          </button>
          <button
            onClick={() => onAdd(result, 'want_to_watch')}
            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium transition"
          >
            Want
          </button>
          <button
            onClick={() => onAdd(result, 'watched')}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition"
          >
            Watched
          </button>
        </div>
      )}
    </div>
  );
}

// Detail Modal Component
function DetailModal({
  item,
  onClose,
  onUpdateRating,
  onUpdateStatus,
  onDelete,
  formatRuntime,
  formatDate,
  getDisplayRating,
}: {
  item: WatchingItem;
  onClose: () => void;
  onUpdateRating: (id: string, rating: number) => void;
  onUpdateStatus: (id: string, status: 'watching' | 'want_to_watch' | 'watched') => void;
  onDelete: (id: string) => void;
  formatRuntime: (minutes: number | null) => string;
  formatDate: (date: string | null) => string;
  getDisplayRating: (item: WatchingItem) => { rating: number; source: 'user' | 'tmdb' };
}) {
  const displayRating = getDisplayRating(item);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full border border-gray-700 overflow-hidden my-8">
        <div className="grid md:grid-cols-5">
          {/* Poster */}
          <div className="md:col-span-2 aspect-[2/3] md:aspect-auto bg-gray-800">
            {item.poster_path ? (
              <img
                src={getPosterUrl(item.poster_path, 'w500')}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {item.media_type === 'movie' ? (
                  <Film className="w-24 h-24 text-gray-600" />
                ) : (
                  <Tv className="w-24 h-24 text-gray-600" />
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="md:col-span-3 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{item.title}</h2>
                <span className="text-gray-400 text-sm">
                  {item.media_type === 'movie' ? 'Movie' : 'Series'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition flex-shrink-0"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Ratings */}
            <div className="mb-4 space-y-3">
              {/* TMDB Rating */}
              <div>
                <p className="text-gray-400 text-sm mb-2">TMDB Rating</p>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor((item.tmdb_rating / 10) * 5)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                  <span className="text-gray-400 text-sm ml-2">
                    {item.tmdb_rating.toFixed(1)}/10
                  </span>
                </div>
              </div>

              {/* Our Rating */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Our Rating</p>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => onUpdateRating(item.id, i + 1)}
                      className="transition hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          item.user_rating && i < item.user_rating
                            ? 'text-orange-400 fill-orange-400'
                            : 'text-gray-600 hover:text-gray-500'
                        }`}
                      />
                    </button>
                  ))}
                  {item.user_rating && (
                    <span className="text-orange-400 text-sm ml-2 font-medium">
                      {item.user_rating}/5
                    </span>
                  )}
                  {!item.user_rating && (
                    <span className="text-gray-500 text-sm ml-2 italic">
                      Click to rate
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center space-x-2 text-gray-300">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  {item.runtime
                    ? item.media_type === 'tv'
                      ? `${item.runtime}m/ep avg`
                      : formatRuntime(item.runtime)
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{formatDate(item.release_date)}</span>
              </div>
            </div>

            {/* Genres */}
            {item.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {item.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Series Info */}
            {item.media_type === 'tv' && (item.seasons || item.episodes) && (
              <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-300">
                  {item.seasons && <span>{item.seasons} Season{item.seasons !== 1 ? 's' : ''}</span>}
                  {item.seasons && item.episodes && <span> • </span>}
                  {item.episodes && <span>{item.episodes} Episode{item.episodes !== 1 ? 's' : ''}</span>}
                </div>
              </div>
            )}

            {/* Description */}
            {item.overview && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm leading-relaxed">{item.overview}</p>
              </div>
            )}

            {/* Status Buttons */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => onUpdateStatus(item.id, 'watching')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  item.status === 'watching'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Watching
              </button>
              <button
                onClick={() => onUpdateStatus(item.id, 'want_to_watch')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  item.status === 'want_to_watch'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Want to Watch
              </button>
              <button
                onClick={() => onUpdateStatus(item.id, 'watched')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  item.status === 'watched'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Watched
              </button>
            </div>

            {/* Delete Button */}
            <button
              onClick={() => onDelete(item.id)}
              className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition"
            >
              Remove from List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

