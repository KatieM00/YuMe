import { useState, useEffect } from 'react';
import { MapPin, Check } from 'lucide-react';

interface Country {
  name: string;
  code: string;
  visited: boolean;
  wantToVisit: boolean;
  visitDate?: string;
}

interface Pin {
  name: string;
  lat: number;
  lng: number;
  type: 'visited' | 'wishlist';
  date?: string;
}

export default function Map() {
  const [countries, setCountries] = useState<Country[]>([
    { name: 'Greece', code: 'GR', visited: true, wantToVisit: false, visitDate: '2023-07' },
    { name: 'United Kingdom', code: 'GB', visited: true, wantToVisit: false, visitDate: '2024-01' },
    { name: 'Italy', code: 'IT', visited: true, wantToVisit: false, visitDate: '2023-09' },
    { name: 'France', code: 'FR', visited: false, wantToVisit: true },
    { name: 'Spain', code: 'ES', visited: false, wantToVisit: true },
    { name: 'Japan', code: 'JP', visited: false, wantToVisit: true },
    { name: 'Iceland', code: 'IS', visited: false, wantToVisit: true },
    { name: 'Portugal', code: 'PT', visited: false, wantToVisit: false },
    { name: 'Switzerland', code: 'CH', visited: false, wantToVisit: false },
    { name: 'Norway', code: 'NO', visited: false, wantToVisit: false },
  ]);

  const [pins, setPins] = useState<Pin[]>([
    { name: 'Athens', lat: 37.9838, lng: 23.7275, type: 'visited', date: '2023-07' },
    { name: 'London', lat: 51.5074, lng: -0.1278, type: 'visited', date: '2024-01' },
    { name: 'Rome', lat: 41.9028, lng: 12.4964, type: 'visited', date: '2023-09' },
    { name: 'Paris', lat: 48.8566, lng: 2.3522, type: 'wishlist' },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503, type: 'wishlist' },
  ]);

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showDateInput, setShowDateInput] = useState(false);
  const [visitDate, setVisitDate] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('yumeMapData');
    if (saved) {
      const data = JSON.parse(saved);
      setCountries(data.countries);
      setPins(data.pins);
    }
  }, []);

  const saveToStorage = (updatedCountries: Country[], updatedPins: Pin[]) => {
    localStorage.setItem('yumeMapData', JSON.stringify({ countries: updatedCountries, pins: updatedPins }));
  };

  const toggleCountry = (countryName: string) => {
    const country = countries.find((c) => c.name === countryName);
    if (!country?.visited && !country?.wantToVisit) {
      setSelectedCountry(countryName);
    } else {
      const updated = countries.map((c) =>
        c.name === countryName ? { ...c, visited: false, wantToVisit: false, visitDate: undefined } : c
      );
      setCountries(updated);
      saveToStorage(updated, pins);
    }
  };

  const markAsVisited = () => {
    if (selectedCountry && visitDate) {
      const updated = countries.map((c) =>
        c.name === selectedCountry ? { ...c, visited: true, wantToVisit: false, visitDate } : c
      );
      setCountries(updated);
      saveToStorage(updated, pins);
      setSelectedCountry(null);
      setShowDateInput(false);
      setVisitDate('');
    }
  };

  const markAsWantToVisit = () => {
    if (selectedCountry) {
      const updated = countries.map((c) =>
        c.name === selectedCountry ? { ...c, visited: false, wantToVisit: true } : c
      );
      setCountries(updated);
      saveToStorage(updated, pins);
      setSelectedCountry(null);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Our Map</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
              <div className="aspect-video bg-gradient-to-br from-blue-900/30 via-gray-900/50 to-green-900/30 rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Interactive Map Visualization</p>
                    <p className="text-gray-500 text-sm mt-2">Pins show visited and wishlist locations</p>
                  </div>
                </div>

                {pins.map((pin, index) => (
                  <div
                    key={index}
                    className="absolute"
                    style={{
                      left: `${((pin.lng + 180) / 360) * 100}%`,
                      top: `${((90 - pin.lat) / 180) * 100}%`,
                    }}
                  >
                    <div className="relative group">
                      <MapPin
                        className={`w-6 h-6 -translate-x-1/2 -translate-y-full ${
                          pin.type === 'visited' ? 'text-green-400' : 'text-red-400'
                        } drop-shadow-lg`}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        {pin.name} {pin.date && `(${pin.date})`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400">Visited</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span className="text-gray-400">Want to Visit</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">Countries</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {countries.map((country) => (
                <div key={country.code}>
                  <div
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition ${
                      country.visited
                        ? 'bg-green-500/20 border border-green-500/50'
                        : country.wantToVisit
                        ? 'bg-red-500/20 border border-red-500/50'
                        : 'bg-gray-900/50 border border-gray-700 hover:bg-gray-900/70'
                    }`}
                    onClick={() => toggleCountry(country.name)}
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{country.name}</p>
                      {country.visitDate && (
                        <p className="text-gray-400 text-xs">Visited: {country.visitDate}</p>
                      )}
                    </div>
                    {(country.visited || country.wantToVisit) && (
                      <Check className="w-5 h-5 text-green-400" />
                    )}
                  </div>

                  {selectedCountry === country.name && (
                    <div className="mt-2 p-3 bg-gray-900/70 rounded-lg border border-gray-700 space-y-2">
                      {!showDateInput ? (
                        <>
                          <button
                            onClick={() => setShowDateInput(true)}
                            className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition"
                          >
                            Mark as Visited
                          </button>
                          <button
                            onClick={markAsWantToVisit}
                            className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition"
                          >
                            Want to Visit
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            type="month"
                            value={visitDate}
                            onChange={(e) => setVisitDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={markAsVisited}
                            className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => {
                              setShowDateInput(false);
                              setSelectedCountry(null);
                              setVisitDate('');
                            }}
                            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
