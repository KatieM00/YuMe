import {
  useState,
  useEffect,
  useMemo
} from 'react';
import {
  Clock,
  Calendar,
  MessageSquare,
  Music, // Box 4
  Map, // Box 5
  Image, // Box 6 (Album/Images)
  Mail, // Box 7 (Inbox/Messages)
  Tv, // Box 8 (Watching)
  HeartHandshake, // Box 9 (Future Hopes)
} from 'lucide-react';

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Helper to get time in a specific timezone
  const getTimeInTimezone = (timezone: string) => {
    return new Date().toLocaleTimeString('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Ensure HH:MM format
    });
  };

  // --- Data for Boxes 1, 2, 3 ---

  // Box 2: Countdown data
  const countdowns = [
    { event: 'Summer Trip to Santorini', date: new Date('2025-07-15') },
    { event: 'Anniversary Celebration', date: new Date('2025-03-20') },
    { event: 'Christmas Together', date: new Date('2025-12-25') },
  ];

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    // Set time of `now` to midnight to only count full days
    now.setHours(0, 0, 0, 0);
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Find the nearest upcoming event
  const nextEvent = useMemo(() => {
    let nearestEvent = null;
    let minDays = Infinity;

    countdowns.forEach(countdown => {
      const days = getDaysUntil(countdown.date);
      // Only consider future events (days > 0)
      if (days > 0 && days < minDays) {
        minDays = days;
        nearestEvent = { ...countdown, days: minDays };
      }
    });

    // Fallback if all dates are in the past or none are set
    if (!nearestEvent) {
      // Pick the next year's date for the last event if current one passed
      const lastEventDate = countdowns[countdowns.length - 1].date;
      const nextYearDate = new Date(lastEventDate.getFullYear() + 1, lastEventDate.getMonth(), lastEventDate.getDate());
      return { event: 'Next big event', date: nextYearDate, days: getDaysUntil(nextYearDate) };
    }

    return nearestEvent;
  }, [currentTime]);

  // Box 3: Most recent message data
  const recentMessage = {
    from: 'Katie',
    to: 'Nassos',
    message: 'Just saw the most beautiful sunset and thought of you...',
  };

  // --- Data for Boxes 4-9 (Navigation Buttons) ---

  const navButtons = [
    { name: 'Music Page', icon: Music, color: 'text-pink-400', bg: 'bg-pink-700/20' }, // Box 4
    { name: 'Map Page', icon: Map, color: 'text-red-400', bg: 'bg-red-700/20' }, // Box 5
    { name: 'Album Page', icon: Image, color: 'text-orange-400', bg: 'bg-orange-700/20' }, // Box 6
    { name: 'Inbox Page', icon: Mail, color: 'text-yellow-400', bg: 'bg-yellow-700/20' }, // Box 7
    { name: 'Watching Page', icon: Tv, color: 'text-lime-400', bg: 'bg-lime-700/20' }, // Box 8
    { name: 'Future Hopes Page', icon: HeartHandshake, color: 'text-fuchsia-400', bg: 'bg-fuchsia-700/20' }, // Box 9
  ];

  const ButtonBox = ({ name, icon: Icon, color, bg }: typeof navButtons[0]) => (
    <button className={`relative flex flex-col items-center justify-center p-6 sm:p-8 h-40 md:h-52 rounded-2xl border border-gray-700 shadow-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${bg}`}>
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 sm:mb-4 bg-gray-900/50 ring-2 ring-gray-600`}>
        <Icon className={`w-8 h-8 sm:w-10 sm:h-10 ${color}`} />
      </div>
      <span className="text-white text-base sm:text-lg font-semibold text-center mt-2">{name}</span>
    </button>
  );

  const TimeBox = () => (
    <div className="flex items-center justify-center h-full">
      <Clock className="w-5 h-5 text-blue-400 mr-3" />
      <p className="text-white text-xl md:text-2xl font-bold tabular-nums">
        GR: {getTimeInTimezone('Europe/Athens')}
      </p>
      <span className="text-gray-500 text-xl md:text-2xl font-bold mx-3">|</span>
      <p className="text-white text-xl md:text-2xl font-bold tabular-nums">
        UK: {getTimeInTimezone('Europe/London')}
      </p>
    </div>
  );

  const CountdownBox = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-3">
      {nextEvent && (
        <>
          <p className="text-green-400 text-3xl md:text-4xl font-extrabold tabular-nums">
            {nextEvent.days}
          </p>
          <p className="text-gray-300 text-base font-medium">
            days until
          </p>
          <p className="text-white text-lg font-semibold truncate max-w-full mt-1">
            {nextEvent.event}
          </p>
        </>
      )}
    </div>
  );

  const MessageBox = () => (
    <div className="flex flex-col items-start justify-center h-full p-3">
      <div className="flex items-center mb-1">
        <MessageSquare className="w-4 h-4 text-cyan-400 mr-2 flex-shrink-0" />
        <span className="text-sm text-gray-400">Most Recent Message</span>
      </div>
      <p className="text-white text-base font-medium leading-tight">
        <span className="text-cyan-300">{recentMessage.from}</span> &gt;{' '}
        <span className="text-blue-300">{recentMessage.to}</span>:
        <span className="ml-1 text-gray-300 truncate max-w-full inline-block">
          {recentMessage.message}
        </span>
      </p>
    </div>
  );


  // Common style for the information boxes (Box 1, 2, 3)
  const InfoBoxStyle = "bg-gray-800/70 backdrop-blur-sm rounded-2xl p-4 h-24 sm:h-28 border border-gray-700 shadow-lg flex items-center justify-center";

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-900 text-white font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Navbar Placeholder - Keeping as is */}
        <header className="mb-8 p-4 bg-gray-900/50 rounded-xl">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100 text-center">Dashboard</h1>
        </header>

        {/* Main Grid: 3 Information Boxes (Top Row) + 6 Navigation Buttons (Bottom Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* BOX 1: Time Zones */}
          <div className={`${InfoBoxStyle} order-1`}>
            <TimeBox />
          </div>

          {/* BOX 2: Countdown */}
          <div className={`${InfoBoxStyle} order-2`}>
            <CountdownBox />
          </div>

          {/* BOX 3: Most Recent Message */}
          <div className={`${InfoBoxStyle} order-3`}>
            <MessageBox />
          </div>

          {/* BOX 4 - 9: Navigation Buttons (Below Info Boxes) */}
          {navButtons.map((button, index) => (
            // Order 4 through 9 ensures they follow Box 1, 2, 3
            <div key={index} className={`order-${index + 4}`}>
              <ButtonBox {...button} />
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}