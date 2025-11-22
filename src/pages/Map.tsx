import { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Trash2, Loader, Check, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Declare mapboxgl as a global variable (loaded from CDN)
declare const mapboxgl: any;

interface Location {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  type: 'visited' | 'wishlist';
  visit_date?: string;
  country_code?: string;
  country_name?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface GeocodingSuggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const addLocationFormRef = useRef<HTMLDivElement>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Add location form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState<Partial<Location>>({
    name: '',
    lat: 0,
    lng: 0,
    type: 'visited',
    visit_date: '',
    notes: '',
  });

  // Geocoding state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Check if Mapbox token is available
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const hasMapboxToken = mapboxToken && mapboxToken !== '';

  const scrollToAddLocationForm = () => {
    setShowAddForm(true);
    setTimeout(() => {
      addLocationFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // Geocoding search function
  const searchLocation = async (query: string) => {
    if (!query.trim() || !hasMapboxToken) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxToken}&limit=5&types=place,locality,region,country`
      );
      const data = await response.json();

      if (data.features) {
        setSuggestions(
          data.features.map((feature: any) => ({
            place_name: feature.place_name,
            center: feature.center,
          }))
        );
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select a suggestion
  const selectSuggestion = (suggestion: GeocodingSuggestion) => {
    const [lng, lat] = suggestion.center;
    setNewLocation({
      ...newLocation,
      name: suggestion.place_name.split(',')[0], // Use just the city name
      lat,
      lng,
    });
    setSearchQuery(suggestion.place_name);
    setShowSuggestions(false);

    // Center map on selected location
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 8,
      });
    }
  };

  // Fetch locations from Supabase
  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('map_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setLocations(data || []);
    } catch (err: any) {
      console.error('Error fetching locations:', err);
      setError(err.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  // Add a new location
  const addLocation = async () => {
    if (!newLocation.name || newLocation.lat === 0 || newLocation.lng === 0) {
      alert('Please search for and select a location from the suggestions');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('map_locations')
        .insert({
          name: newLocation.name,
          lat: newLocation.lat,
          lng: newLocation.lng,
          type: newLocation.type || 'visited',
          visit_date: newLocation.visit_date || null,
          notes: newLocation.notes || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setLocations([data, ...locations]);
      setShowAddForm(false);
      setNewLocation({
        name: '',
        lat: 0,
        lng: 0,
        type: 'visited',
        visit_date: '',
        notes: '',
      });
      setSearchQuery('');
      setSuggestions([]);
    } catch (err: any) {
      console.error('Error adding location:', err);
      alert('Failed to add location: ' + err.message);
    }
  };

  // Delete a location
  const deleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('map_locations')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setLocations(locations.filter((loc) => loc.id !== id));
    } catch (err: any) {
      console.error('Error deleting location:', err);
      alert('Failed to delete location: ' + err.message);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!hasMapboxToken || !mapContainerRef.current || mapRef.current) return;

    // Wait for mapboxgl to be available from CDN
    if (typeof mapboxgl === 'undefined') {
      console.warn('Mapbox GL JS is not loaded yet');
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [0, 20],
        zoom: 1.5,
        projection: 'mercator',
      });

      map.on('load', () => {
        setMapLoaded(true);
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map');
    }
  }, [hasMapboxToken, mapboxToken]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !hasMapboxToken) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    locations.forEach((location) => {
      if (typeof mapboxgl === 'undefined') return;

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="${
          location.type === 'visited' ? '#10b981' : '#ef4444'
        }" stroke="white" stroke-width="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="color: #000; padding: 8px;">
          <h3 style="font-weight: bold; margin-bottom: 4px;">${location.name}</h3>
          ${location.visit_date ? `<p style="font-size: 12px; color: #666;">📅 ${location.visit_date}</p>` : ''}
          ${location.notes ? `<p style="font-size: 12px; margin-top: 4px;">${location.notes}</p>` : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .setPopup(popup)
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [locations, mapLoaded, hasMapboxToken]);

  // Fetch locations on mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const visitedLocations = locations.filter((loc) => loc.type === 'visited');
  const wishlistLocations = locations.filter((loc) => loc.type === 'wishlist');

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Our Map</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Mobile floating add button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-110"
          title={showAddForm ? 'Close' : 'Add location'}
        >
          {showAddForm ? (
            <span className="text-2xl">×</span>
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>

        {/* Mobile add form overlay */}
        {showAddForm && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowAddForm(false)} />
        )}

        {/* Mobile add form sheet */}
        {showAddForm && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 rounded-t-2xl p-6 z-50 max-h-[80vh] overflow-y-auto">
            <div ref={addLocationFormRef}>
              <h3 className="text-white font-semibold mb-4 text-lg">Add a Location</h3>
              <div className="space-y-3">
                {/* Search location */}
                <div className="relative">
                  <label className="text-xs text-gray-400 mb-1 block">Search Location</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Paris, Tokyo"
                    />
                    {isSearching && (
                      <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                    )}
                  </div>

                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectSuggestion(suggestion)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0"
                        >
                          <MapPin className="inline w-3 h-3 mr-2 text-gray-500" />
                          {suggestion.place_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Type</label>
                  <select
                    value={newLocation.type}
                    onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value as 'visited' | 'wishlist' })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="visited">✓ Visited</option>
                    <option value="wishlist">★ Want to Visit</option>
                  </select>
                </div>

                {newLocation.type === 'visited' && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Visit Date (optional)</label>
                    <input
                      type="month"
                      value={newLocation.visit_date}
                      onChange={(e) => setNewLocation({ ...newLocation, visit_date: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
                  <textarea
                    value={newLocation.notes}
                    onChange={(e) => setNewLocation({ ...newLocation, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Add a note..."
                  />
                </div>

                {newLocation.lat !== 0 && newLocation.lng !== 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                    <p className="text-green-400 text-xs">✓ {newLocation.name}</p>
                  </div>
                )}

                <button
                  onClick={addLocation}
                  disabled={newLocation.lat === 0}
                  className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition font-medium"
                >
                  Add Location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile view - same as before */}
        <div className="lg:hidden space-y-6">
          {/* Map Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700 shadow-xl">
            {!hasMapboxToken ? (
              <div className="w-full h-64 bg-gradient-to-br from-blue-900/30 via-gray-900/50 to-green-900/30 rounded-xl flex items-center justify-center">
                <div className="text-center p-4">
                  <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-base font-semibold mb-2">Map Not Configured</p>
                  <p className="text-gray-500 text-xs mb-4">
                    Add <code className="bg-gray-800 px-2 py-1 rounded text-xs">VITE_MAPBOX_TOKEN</code> to Netlify
                  </p>
                  <p className="text-gray-600 text-xs">
                    Get a free token at{' '}
                    <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                      mapbox.com
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div ref={mapContainerRef} className="w-full h-64 rounded-xl overflow-hidden" />
            )}

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span className="text-gray-400 text-xs">Visited: {visitedLocations.length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span className="text-gray-400 text-xs">Wishlist: {wishlistLocations.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Locations List */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Your Locations</h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-3">No locations yet</p>
                <p className="text-gray-500 text-xs">Tap the + button to add your first location</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visited Locations */}
                {visitedLocations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center">
                      <Check className="w-4 h-4 mr-1" />
                      Visited ({visitedLocations.length})
                    </h3>
                    <div className="space-y-2">
                      {visitedLocations.map((location) => (
                        <div
                          key={location.id}
                          className="group bg-green-500/10 border border-green-500/30 rounded-lg p-3 hover:bg-green-500/20 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm truncate">{location.name}</p>
                              {location.visit_date && (
                                <p className="text-gray-400 text-xs mt-0.5">{location.visit_date}</p>
                              )}
                              {location.notes && (
                                <p className="text-gray-500 text-xs mt-1 line-clamp-2">{location.notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => location.id && deleteLocation(location.id)}
                              className="ml-2 p-1.5 text-gray-400 hover:text-red-400 transition flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wishlist Locations */}
                {wishlistLocations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Want to Visit ({wishlistLocations.length})
                    </h3>
                    <div className="space-y-2">
                      {wishlistLocations.map((location) => (
                        <div
                          key={location.id}
                          className="group bg-red-500/10 border border-red-500/30 rounded-lg p-3 hover:bg-red-500/20 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm truncate">{location.name}</p>
                              {location.notes && (
                                <p className="text-gray-500 text-xs mt-1 line-clamp-2">{location.notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => location.id && deleteLocation(location.id)}
                              className="ml-2 p-1.5 text-gray-400 hover:text-red-400 transition flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop view - Map + Add Form on top, Locations below */}
        <div className="hidden lg:block space-y-6">
          {/* Top row: Map (2/3) + Add Form (1/3) */}
          <div className="grid grid-cols-3 gap-6 h-[calc(100vh-24rem)]">
            {/* Map - 2/3 width */}
            <div className="col-span-2">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl h-full flex flex-col">
                {!hasMapboxToken ? (
                  <div className="flex-1 bg-gradient-to-br from-blue-900/30 via-gray-900/50 to-green-900/30 rounded-xl flex items-center justify-center">
                    <div className="text-center p-8">
                      <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg font-semibold mb-2">Map Not Configured</p>
                      <p className="text-gray-500 text-sm mb-4">
                        Add <code className="bg-gray-800 px-2 py-1 rounded text-xs">VITE_MAPBOX_TOKEN</code> to Netlify
                      </p>
                      <p className="text-gray-600 text-xs">
                        Get a free token at{' '}
                        <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                          mapbox.com
                        </a>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div ref={mapContainerRef} className="flex-1 rounded-xl overflow-hidden" />
                )}

                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="text-gray-400 text-sm">Visited: {visitedLocations.length}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="text-gray-400 text-sm">Wishlist: {wishlistLocations.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Location Form - 1/3 width */}
            <div className="col-span-1">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl h-full flex flex-col">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Location
                </h2>

                <div className="space-y-4 flex-1 overflow-y-auto">
                  {/* Search location */}
                  <div className="relative">
                    <label className="text-sm text-gray-400 mb-2 block">Search Location</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        className="w-full pl-10 pr-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Paris, Tokyo"
                      />
                      {isSearching && (
                        <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                      )}
                    </div>

                    {/* Suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => selectSuggestion(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-800 text-white text-sm border-b border-gray-800 last:border-b-0"
                          >
                            <MapPin className="inline w-3 h-3 mr-2 text-gray-500" />
                            {suggestion.place_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Type</label>
                    <select
                      value={newLocation.type}
                      onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value as 'visited' | 'wishlist' })}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="visited">✓ Visited</option>
                      <option value="wishlist">★ Want to Visit</option>
                    </select>
                  </div>

                  {newLocation.type === 'visited' && (
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Visit Date (optional)</label>
                      <input
                        type="month"
                        value={newLocation.visit_date}
                        onChange={(e) => setNewLocation({ ...newLocation, visit_date: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Notes (optional)</label>
                    <textarea
                      value={newLocation.notes}
                      onChange={(e) => setNewLocation({ ...newLocation, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                      placeholder="Add a note..."
                    />
                  </div>

                  {newLocation.lat !== 0 && newLocation.lng !== 0 && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                      <p className="text-green-400 text-sm">✓ {newLocation.name}</p>
                    </div>
                  )}

                  <button
                    onClick={addLocation}
                    disabled={newLocation.lat === 0}
                    className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition font-medium"
                  >
                    Add Location
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row: Locations List (full width) */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Your Locations
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No locations yet. Use the form above to add your first location!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visited Locations */}
                {visitedLocations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
                      <Check className="w-4 h-4 mr-1" />
                      Visited ({visitedLocations.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {visitedLocations.map((location) => (
                        <div
                          key={location.id}
                          className="group bg-green-500/10 border border-green-500/30 rounded-lg p-4 hover:bg-green-500/20 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm truncate">{location.name}</p>
                              {location.visit_date && (
                                <p className="text-gray-400 text-xs mt-1">{location.visit_date}</p>
                              )}
                              {location.notes && (
                                <p className="text-gray-500 text-xs mt-2 line-clamp-2">{location.notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => location.id && deleteLocation(location.id)}
                              className="ml-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wishlist Locations */}
                {wishlistLocations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Want to Visit ({wishlistLocations.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {wishlistLocations.map((location) => (
                        <div
                          key={location.id}
                          className="group bg-red-500/10 border border-red-500/30 rounded-lg p-4 hover:bg-red-500/20 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm truncate">{location.name}</p>
                              {location.notes && (
                                <p className="text-gray-500 text-xs mt-2 line-clamp-2">{location.notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => location.id && deleteLocation(location.id)}
                              className="ml-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
