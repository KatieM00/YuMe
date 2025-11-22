import { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Trash2, Loader } from 'lucide-react';
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

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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

  // Check if Mapbox token is available
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const hasMapboxToken = mapboxToken && mapboxToken !== '';

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
    if (!newLocation.name || !newLocation.lat || !newLocation.lng) {
      alert('Please fill in all required fields');
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
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [0, 20],
        zoom: 1.5,
        projection: 'mercator',
      });

      map.on('load', () => {
        setMapLoaded(true);
      });

      // Add click handler to get coordinates
      map.on('click', (e: any) => {
        const { lng, lat } = e.lngLat;
        setNewLocation((prev) => ({
          ...prev,
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
        }));
        setShowAddForm(true);
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
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${
          location.type === 'visited' ? '#4ade80' : '#f87171'
        }" stroke="white" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="color: #000; padding: 8px;">
          <h3 style="font-weight: bold; margin-bottom: 4px;">${location.name}</h3>
          ${location.visit_date ? `<p style="font-size: 12px; color: #666;">${location.visit_date}</p>` : ''}
          ${location.notes ? `<p style="font-size: 12px; margin-top: 4px;">${location.notes}</p>` : ''}
          <p style="font-size: 11px; color: #999; margin-top: 4px;">${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}</p>
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

  const visitedCount = locations.filter((loc) => loc.type === 'visited').length;
  const wishlistCount = locations.filter((loc) => loc.type === 'wishlist').length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Our Map</h1>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-green-400" />
              <span className="text-gray-400">Visited: {visitedCount}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-red-400" />
              <span className="text-gray-400">Wishlist: {wishlistCount}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
              {!hasMapboxToken ? (
                <div className="aspect-video bg-gradient-to-br from-blue-900/30 via-gray-900/50 to-green-900/30 rounded-xl flex items-center justify-center">
                  <div className="text-center p-8">
                    <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg font-semibold mb-2">Map Not Configured</p>
                    <p className="text-gray-500 text-sm mb-4">
                      Add <code className="bg-gray-800 px-2 py-1 rounded">VITE_MAPBOX_TOKEN</code> to your Netlify environment variables
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
                <div
                  ref={mapContainerRef}
                  className="aspect-video rounded-xl overflow-hidden"
                  style={{ minHeight: '400px' }}
                />
              )}

              {hasMapboxToken && (
                <div className="mt-4 text-xs text-gray-500">
                  💡 Click anywhere on the map to add a new location
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Add Location Form */}
            {showAddForm && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
                <h2 className="text-xl font-semibold text-white mb-4">Add Location</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Name *</label>
                    <input
                      type="text"
                      value={newLocation.name}
                      onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Paris, Tokyo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Latitude *</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={newLocation.lat}
                        onChange={(e) => setNewLocation({ ...newLocation, lat: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Longitude *</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={newLocation.lng}
                        onChange={(e) => setNewLocation({ ...newLocation, lng: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Type *</label>
                    <select
                      value={newLocation.type}
                      onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value as 'visited' | 'wishlist' })}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="visited">Visited</option>
                      <option value="wishlist">Wishlist</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Visit Date</label>
                    <input
                      type="month"
                      value={newLocation.visit_date}
                      onChange={(e) => setNewLocation({ ...newLocation, visit_date: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Notes</label>
                    <textarea
                      value={newLocation.notes}
                      onChange={(e) => setNewLocation({ ...newLocation, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Optional notes..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={addLocation}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewLocation({ name: '', lat: 0, lng: 0, type: 'visited', visit_date: '', notes: '' });
                      }}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Locations List */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Locations</h2>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No locations yet</p>
                  <p className="text-gray-600 text-xs mt-1">Click the map or + button to add one</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border transition ${
                        location.type === 'visited'
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <MapPin className={`w-5 h-5 mt-0.5 flex-shrink-0 ${location.type === 'visited' ? 'text-green-400' : 'text-red-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{location.name}</p>
                        {location.visit_date && <p className="text-gray-400 text-xs">Visited: {location.visit_date}</p>}
                        {location.notes && <p className="text-gray-500 text-xs mt-1">{location.notes}</p>}
                        <p className="text-gray-600 text-xs mt-1">
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </p>
                      </div>
                      <button
                        onClick={() => location.id && deleteLocation(location.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
