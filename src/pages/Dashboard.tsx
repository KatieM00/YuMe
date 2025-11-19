import { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, MessageSquare } from 'lucide-react';

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getTimeInTimezone = (timezone: string) => {
    return new Date().toLocaleTimeString('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const countdowns = [
    { event: 'Summer Trip to Santorini', date: new Date('2025-07-15'), location: 'Greece' },
    { event: 'Anniversary Celebration', date: new Date('2025-03-20'), location: 'London' },
    { event: 'Christmas Together', date: new Date('2025-12-25'), location: 'Athens' },
  ];

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const locations = [
    { person: 'Nassos', city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
    { person: 'Katie', city: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  ];

  const recentMessage = {
    from: 'Katie',
    to: 'Nassos',
    message: 'Just saw the most beautiful sunset and thought of you...',
    time: '2 hours ago',
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl hover:shadow-2xl transition">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Time</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Greece</p>
                <p className="text-3xl font-bold text-white tabular-nums">
                  {getTimeInTimezone('Europe/Athens')}
                </p>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-400 text-sm mb-1">United Kingdom</p>
                <p className="text-3xl font-bold text-white tabular-nums">
                  {getTimeInTimezone('Europe/London')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl hover:shadow-2xl transition">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Countdowns</h2>
            </div>
            <div className="space-y-3">
              {countdowns.map((countdown, index) => {
                const days = getDaysUntil(countdown.date);
                return (
                  <div key={index} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <p className="text-white font-medium text-sm mb-1">{countdown.event}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-400">{days} days</span>
                      <span className="text-gray-400 text-xs">{countdown.location}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl hover:shadow-2xl transition">
            <div className="flex items-center space-x-3 mb-4">
              <MapPin className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-semibold text-white">Locations</h2>
            </div>
            <div className="space-y-4">
              {locations.map((location, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {location.person.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{location.person}</p>
                    <p className="text-gray-400 text-sm">
                      {location.city}, {location.country}
                    </p>
                  </div>
                </div>
              ))}
              <div className="mt-4 bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                <div className="w-full h-32 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl hover:shadow-2xl transition md:col-span-2 lg:col-span-3">
            <div className="flex items-center space-x-3 mb-4">
              <MessageSquare className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Recent Message</h2>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {recentMessage.from.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {recentMessage.from} → {recentMessage.to}
                    </p>
                    <p className="text-gray-400 text-xs">{recentMessage.time}</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-300 ml-12">{recentMessage.message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
