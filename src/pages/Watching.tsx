import { useState, useEffect } from 'react';
import { Plus, Film, Star, Filter, X } from 'lucide-react';

interface WatchItem {
  id: number;
  title: string;
  type: 'movie' | 'series';
  poster: string;
  rating: number;
  genre: string;
  vibe: string;
  status: 'watching' | 'watched' | 'wishlist';
  comments: string;
}

export default function Watching() {
  const [items, setItems] = useState<WatchItem[]>([
    {
      id: 1,
      title: 'Eternal Sunshine',
      type: 'movie',
      poster: 'bg-gradient-to-br from-blue-400 to-purple-500',
      rating: 5,
      genre: 'Romance',
      vibe: 'Emotional',
      status: 'watched',
      comments: 'This movie made us both cry. So beautiful.',
    },
    {
      id: 2,
      title: 'Before Sunrise',
      type: 'movie',
      poster: 'bg-gradient-to-br from-orange-400 to-pink-500',
      rating: 5,
      genre: 'Romance',
      vibe: 'Dreamy',
      status: 'watched',
      comments: 'Our favorite love story',
    },
    {
      id: 3,
      title: 'Stranger Things',
      type: 'series',
      poster: 'bg-gradient-to-br from-red-600 to-black',
      rating: 4,
      genre: 'Sci-Fi',
      vibe: 'Thrilling',
      status: 'watching',
      comments: 'Currently on season 3!',
    },
    {
      id: 4,
      title: 'La La Land',
      type: 'movie',
      poster: 'bg-gradient-to-br from-yellow-400 to-pink-500',
      rating: 4,
      genre: 'Musical',
      vibe: 'Uplifting',
      status: 'watched',
      comments: 'The music is incredible',
    },
    {
      id: 5,
      title: 'Your Name',
      type: 'movie',
      poster: 'bg-gradient-to-br from-cyan-400 to-blue-600',
      rating: 5,
      genre: 'Anime',
      vibe: 'Emotional',
      status: 'watched',
      comments: 'A masterpiece',
    },
    {
      id: 6,
      title: 'Inception',
      type: 'movie',
      poster: 'bg-gradient-to-br from-gray-700 to-blue-900',
      rating: 0,
      genre: 'Sci-Fi',
      vibe: 'Mind-bending',
      status: 'wishlist',
      comments: '',
    },
  ]);

  const [selectedItem, setSelectedItem] = useState<WatchItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('yumeWatching');
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const saveToStorage = (updatedItems: WatchItem[]) => {
    localStorage.setItem('yumeWatching', JSON.stringify(updatedItems));
  };

  const filteredItems = items.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterGenre !== 'all' && item.genre !== filterGenre) return false;
    return true;
  });

  const genres = Array.from(new Set(items.map((item) => item.genre)));

  const updateRating = (id: number, rating: number) => {
    const updated = items.map((item) => (item.id === id ? { ...item, rating } : item));
    setItems(updated);
    saveToStorage(updated);
    if (selectedItem?.id === id) {
      setSelectedItem({ ...selectedItem, rating });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Watching</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <Filter className="w-5 h-5" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition">
              <Plus className="w-5 h-5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="watching">Currently Watching</option>
                  <option value="watched">Watched</option>
                  <option value="wishlist">Want to Watch</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Genre</label>
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Genres</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {['watching', 'watched', 'wishlist'].map((status) => {
            const statusItems = filteredItems.filter((item) => item.status === status);
            if (statusItems.length === 0) return null;

            return (
              <div key={status}>
                <h2 className="text-2xl font-bold text-white mb-4 capitalize">
                  {status === 'watching'
                    ? 'Currently Watching'
                    : status === 'watched'
                    ? 'Watched'
                    : 'Want to Watch'}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {statusItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="group cursor-pointer"
                    >
                      <div className={`aspect-[2/3] ${item.poster} rounded-lg overflow-hidden relative shadow-lg group-hover:shadow-2xl transition mb-2`}>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center">
                          <Film className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        {item.type === 'series' && (
                          <div className="absolute top-2 right-2 bg-blue-500 px-2 py-1 rounded text-xs text-white font-medium">
                            SERIES
                          </div>
                        )}
                      </div>
                      <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
                      {item.rating > 0 && (
                        <div className="flex items-center space-x-1 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < item.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {selectedItem && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-2xl w-full border border-gray-700 overflow-hidden">
              <div className="grid md:grid-cols-5">
                <div className={`${selectedItem.poster} md:col-span-2 aspect-[2/3] md:aspect-auto flex items-center justify-center relative`}>
                  <Film className="w-16 h-16 text-white/30" />
                  {selectedItem.type === 'series' && (
                    <div className="absolute top-4 right-4 bg-blue-500 px-3 py-1 rounded text-sm text-white font-medium">
                      SERIES
                    </div>
                  )}
                </div>

                <div className="md:col-span-3 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedItem.title}</h2>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                          {selectedItem.genre}
                        </span>
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                          {selectedItem.vibe}
                        </span>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs capitalize">
                          {selectedItem.status === 'watching'
                            ? 'Watching'
                            : selectedItem.status === 'watched'
                            ? 'Watched'
                            : 'Wishlist'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition flex-shrink-0"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-400 text-sm mb-2">Rating</p>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => updateRating(selectedItem.id, i + 1)}
                          className="transition hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              i < selectedItem.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600 hover:text-gray-500'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedItem.comments && (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-gray-300 text-sm">{selectedItem.comments}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
