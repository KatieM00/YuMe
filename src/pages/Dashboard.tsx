import {
  useState,
  useEffect,
  useMemo,
  ComponentType
} from 'react';
import {
  Clock,
  Calendar,
  MessageSquare,
  Music,
  Map,
  Image,
  Mail,
  Tv,
  HeartHandshake,
  LayoutDashboard
} from 'lucide-react';

// =========================================================================
// 1. PLACEHOLDER COMPONENTS FOR PAGE NAVIGATION
// =========================================================================

type PageProps = {
    title: string;
    icon: ComponentType<{ className: string }>;
    setPage: (page: string) => void;
};

const PagePlaceholder = ({ title, icon: Icon, setPage }: PageProps) => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
        <Icon className="w-16 h-16 text-white mb-4 opacity-70" />
        <h2 className="3xl font-bold text-white mb-4">{title}</h2>
        <p className="text-gray-400 text-lg text-center">
            This is the content area for the {title}.
        </p>
        <button 
            onClick={() => setPage('dashboard')} 
            className="mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
            Back to Dashboard
        </button>
    </div>
);

const MusicPage = ({ setPage }: { setPage: (page: string) => void }) => <PagePlaceholder title="Music Page" icon={Music} setPage={setPage} />;
const MapPage = ({ setPage }: { setPage: (page: string) => void }) => <PagePlaceholder title="Map Page" icon={Map} setPage={setPage} />;
const AlbumPage = ({ setPage }: { setPage: (page: string) => void }) => <PagePlaceholder title="Album Page" icon={Image} setPage={setPage} />;
const InboxPage = ({ setPage }: { setPage: (page: string) => void }) => <PagePlaceholder title="Inbox Page" icon={Mail} setPage={setPage} />;
const WatchingPage = ({ setPage }: { setPage: (page: string) => void }) => <PagePlaceholder title="Watching Page" icon={Tv} setPage={setPage} />;
const HopesPage = ({ setPage }: { setPage: (page: string) => void }) => <PagePlaceholder title="Future Hopes Page" icon={HeartHandshake} setPage={setPage} />;


// =========================================================================
// 2. DASHBOARD CONTENT (THE MAIN GRID)
// =========================================================================

type DashboardProps = {
    setPage: (page: string) => void;
};

const DashboardContent = ({ setPage }: DashboardProps) => {
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
      hour12: false,
    });
  };

  const countdowns = [
    { event: 'Summer Trip to Santorini', date: new Date('2025-07-15') },
    { event: 'Anniversary Celebration', date: new Date('2025-03-20') },
    { event: 'Christmas Together', date: new Date('2025-12-25') },
  ];

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const nextEvent = useMemo(() => {
    let nearestEvent = null;
    let minDays = Infinity;

    countdowns.forEach(countdown => {
      const days = getDaysUntil(countdown.date);
      if (days > 0 && days < minDays) {
        minDays = days;
        nearestEvent = { ...countdown, days: minDays };
      }
    });

    if (!nearestEvent) {
      const farthestEvent = countdowns[countdowns.length - 1];
      const nextYearDate = new Date(farthestEvent.date.getFullYear() + 1, farthestEvent.date.getMonth(), farthestEvent.date.getDate());
      return { event: 'Next big event', date: nextYearDate, days: getDaysUntil(nextYearDate) };
    }

    return nearestEvent;
  }, [currentTime]);

  const recentMessage = {
    from: 'Katie',
    to: 'Nassos',
    message: 'Just saw the most beautiful sunset and thought of you...',
  };

  const InfoBoxContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 h-20 sm:h-24 md:h-28 border border-gray-700 shadow-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl">
      {children}
    </div>
  );

  const TimeBox = () => (
    <div className="flex items-center justify-center w-full text-center text-sm md:text-base">
      <Clock className="w-4 h-4 text-blue-400 mr-2 flex-shrink-0" />
      <p className="text-white font-bold tabular-nums">
        GR: {getTimeInTimezone('Europe/Athens')}
      </p>
      <span className="text-gray-500 font-bold mx-2">|</span>
      <p className="text-white font-bold tabular-nums">
        UK: {getTimeInTimezone('Europe/London')}
      </p>
    </div>
  );

  const CountdownBox = () => (
    <div className="flex flex-col items-center justify-center w-full text-center p-1">
      {nextEvent && (
        <>
          <p className="text-green-400 text-xl md:text-2xl font-extrabold tabular-nums leading-none">
            {nextEvent.days}
          </p>
          <p className="text-gray-300 text-xs md:text-sm font-medium leading-tight">
            days until
          </p>
          <p className="text-white text-sm md:text-base font-semibold truncate max-w-full mt-1 leading-tight">
            {nextEvent.event}
          </p>
        </>
      )}
    </div>
  );

  const MessageBox = () => (
    <div className="flex flex-col items-start justify-center w-full p-1 h-full overflow-hidden">
      <div className="flex items-center mb-1 flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-cyan-400 mr-2" />
        <span className="text-xs text-gray-400 font-medium">Recent Message</span>
      </div>
      <p className="text-gray-300 text-sm leading-tight line-clamp-2">
        <span className="text-cyan-300 font-semibold">{recentMessage.from}</span> &gt;{' '}
        <span className="text-blue-300 font-semibold">{recentMessage.to}</span>:
        <span className="ml-1 font-normal">
          {recentMessage.message}
        </span>
      </p>
    </div>
  );

  const navButtons = [
    { id: 'music', name: 'Music Page', icon: Music, color: 'text-pink-400', bg: 'bg-pink-900/40' },
    { id: 'map', name: 'Map Page', icon: Map, color: 'text-red-400', bg: 'bg-red-900/40' },
    { id: 'album', name: 'Album Page', icon: Image, color: 'text-orange-400', bg: 'bg-orange-900/40' },
    { id: 'inbox', name: 'Inbox Page', icon: Mail, color: 'text-yellow-400', bg: 'bg-yellow-900/40' },
    { id: 'watching', name: 'Watching Page', icon: Tv, color: 'text-lime-400', bg: 'bg-lime-900/40' },
    { id: 'hopes', name: 'Future Hopes Page', icon: HeartHandshake, color: 'text-fuchsia-400', bg: 'bg-fuchsia-900/40' },
  ];

  const ButtonBox = ({ id, name, icon: Icon, color, bg }: typeof navButtons[0]) => (
    <button
        onClick={() => setPage(id)}
        className={`relative flex flex-col items-center justify-center p-6 h-full min-h-[150px] sm:min-h-[180px] rounded-2xl border border-gray-700 shadow-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${bg}`}
    >
      <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 bg-gray-900/50 ring-2 ring-gray-600`}>
        <Icon className={`w-7 h-7 sm:w-10 sm:h-10 ${color}`} />
      </div>
      <span className="text-white text-base sm:text-lg font-semibold text-center mt-2">{name}</span>
    </button>
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 md:mb-8">
        <InfoBoxContainer><TimeBox /></InfoBoxContainer>
        <InfoBoxContainer><CountdownBox /></InfoBoxContainer>
        <InfoBoxContainer><MessageBox /></InfoBoxContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {navButtons.map((button, index) => (
          <ButtonBox key={index} {...button} />
        ))}
      </div>
    </>
  );
}

// =========================================================================
// 3. MAIN APP (ROOT COMPONENT WITH ROUTING)
// =========================================================================

export default function App() {
    const [page, setPage] = useState('dashboard');

    const renderPage = () => {
        const pageProps = { setPage };

        switch (page) {
            case 'music':
                return <MusicPage {...pageProps} />;
            case 'map':
                return <MapPage {...pageProps} />;
            case 'album':
                return <AlbumPage {...pageProps} />;
            case 'inbox':
                return <InboxPage {...pageProps} />;
            case 'watching':
                return <WatchingPage {...pageProps} />;
            case 'hopes':
                return <HopesPage {...pageProps} />;
            case 'dashboard':
            default:
                return <DashboardContent setPage={setPage} />;
        }
    };
    
    return (
        <div className="min-h-screen p-4 md:p-8 bg-gray-950 text-white font-sans">
            <div className="max-w-7xl mx-auto">
                {renderPage()}
            </div>
        </div>
    );
}