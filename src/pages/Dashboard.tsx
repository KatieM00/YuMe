import {
  useState,
  useEffect,
  useMemo
} from 'react';
import {
  Clock,
  Calendar,
  MessageSquare,
  Play,
  X,
  Settings,
  LogOut
} from 'lucide-react';
import { getCurrentUserProfile, getPartnerInfo, type UserProfile, type PartnerInfo } from '../lib/partnerService';
import { getAllVisionItems, type VisionItem } from '../lib/visionService';
import { getAllMessages, type Message } from '../lib/messageService';

// =========================================================================
// DASHBOARD CONTENT
// =========================================================================

type DashboardProps = {
    setPage: (page: string) => void;
};

const DashboardContent = ({ setPage }: DashboardProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerInfo | null>(null);
  const [visionItems, setVisionItems] = useState<VisionItem[]>([]);
  const [recentMessage, setRecentMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaModalType, setMediaModalType] = useState<'image' | 'video' | 'voice' | null>(null);
  const [mediaModalUrl, setMediaModalUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load user profile and partner info
      const profile = await getCurrentUserProfile();
      setUserProfile(profile);

      if (profile?.partner_id) {
        const partner = await getPartnerInfo();
        setPartnerProfile(partner);
      }

      // Load vision items with dates for calendar events
      const items = await getAllVisionItems();
      setVisionItems(items);

      // Load most recent message
      const messages = await getAllMessages();
      const activeMessages = messages.filter(m => m.status === 'active' || m.status === 'pinned');
      if (activeMessages.length > 0) {
        // Sort by created_at descending to get the most recent
        const sorted = activeMessages.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentMessage(sorted[0]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeInTimezone = (timezone: string) => {
    return new Date().toLocaleTimeString('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getCountryFlag = (countryCode: string | null | undefined) => {
    if (!countryCode || countryCode.length !== 2) return null;
    // Convert country code to flag emoji using regional indicator symbols
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const calculateDistance = (lat1: number | null | undefined, lon1: number | null | undefined, lat2: number | null | undefined, lon2: number | null | undefined): number | null => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;

    // Haversine formula to calculate distance between two points
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance);
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const nextEvent = useMemo(() => {
    // Filter vision items that have event_date set
    const eventsWithDates = visionItems.filter(item => item.event_date);

    if (eventsWithDates.length === 0) {
      return null;
    }

    let nearestEvent = null;
    let minDays = Infinity;

    eventsWithDates.forEach(item => {
      const eventDate = new Date(item.event_date!);
      const days = getDaysUntil(eventDate);
      if (days > 0 && days < minDays) {
        minDays = days;
        nearestEvent = { event: item.title, date: eventDate, days: minDays };
      }
    });

    return nearestEvent;
  }, [visionItems]);

  const InfoBoxContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="relative bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 h-20 sm:h-24 md:h-28 shadow-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500 opacity-75 blur-[1px]" style={{ padding: '2px' }}></div>
      <div className="absolute inset-[2px] bg-gray-800/90 backdrop-blur-sm rounded-xl"></div>
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );

  const TimeBox = () => {
    const userTimezone = userProfile?.timezone || 'Europe/London';
    const partnerTimezone = partnerProfile?.timezone || null;

    const getUserLabel = () => {
      if (userProfile?.display_name) return userProfile.display_name;
      return 'You';
    };

    const getPartnerLabel = () => {
      if (partnerProfile?.display_name) return partnerProfile.display_name;
      return 'Partner';
    };

    const userFlag = getCountryFlag(userProfile?.country_code);
    const partnerFlag = getCountryFlag(partnerProfile?.country_code);
    const distance = calculateDistance(
      userProfile?.latitude,
      userProfile?.longitude,
      partnerProfile?.latitude,
      partnerProfile?.longitude
    );

    return (
      <div className="flex flex-col items-center justify-center w-full text-center">
        <div className="flex items-center text-sm md:text-base">
          <Clock className="w-4 h-4 text-blue-400 mr-2 flex-shrink-0" />
          <p className="text-white font-bold tabular-nums flex items-center gap-1.5">
            {userFlag && <span className="text-lg">{userFlag}</span>}
            {getUserLabel()}: {getTimeInTimezone(userTimezone)}
          </p>
          {partnerTimezone && (
            <>
              <span className="text-gray-500 font-bold mx-2">|</span>
              <p className="text-white font-bold tabular-nums flex items-center gap-1.5">
                {partnerFlag && <span className="text-lg">{partnerFlag}</span>}
                {getPartnerLabel()}: {getTimeInTimezone(partnerTimezone)}
              </p>
            </>
          )}
        </div>
        {distance && (
          <p className="text-gray-400 text-xs mt-1">
            {distance.toLocaleString()} km apart
          </p>
        )}
      </div>
    );
  };

  const CountdownBox = () => (
    <div className="flex flex-col items-center justify-center w-full text-center p-1">
      {nextEvent ? (
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
      ) : (
        <div className="flex flex-col items-center justify-center">
          <Calendar className="w-6 h-6 text-gray-500 mb-1" />
          <p className="text-gray-400 text-xs">No upcoming events</p>
          <p className="text-gray-500 text-[10px] mt-1">Add dates to Vision items</p>
        </div>
      )}
    </div>
  );

  const handleMediaClick = (type: 'image' | 'video' | 'voice', url: string) => {
    setMediaModalType(type);
    setMediaModalUrl(url);
    setShowMediaModal(true);
  };

  const MessageBox = () => (
    <div className="flex items-center justify-between w-full p-1 h-full overflow-hidden">
      <div className="flex flex-col items-start justify-center flex-1 min-w-0">
        <div className="flex items-center mb-1 flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-cyan-400 mr-2" />
          <span className="text-xs text-gray-400 font-medium">Recent Message</span>
        </div>
        {recentMessage ? (
          <p className="text-gray-300 text-sm leading-tight line-clamp-2">
            <span className="text-cyan-300 font-semibold">{recentMessage.from_user}</span> &gt;{' '}
            <span className="text-blue-300 font-semibold">{recentMessage.to_user}</span>:
            <span className="ml-1 font-normal">
              {recentMessage.type === 'text'
                ? recentMessage.content
                : `[${recentMessage.type}]`}
            </span>
          </p>
        ) : (
          <p className="text-gray-400 text-xs italic">No messages yet</p>
        )}
      </div>

      {/* Media preview on the right */}
      {recentMessage?.media_url && (
        <div className="ml-2 flex-shrink-0">
          {recentMessage.type === 'image' && (
            <img
              src={recentMessage.media_url}
              alt="Message preview"
              className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition"
              onClick={() => handleMediaClick('image', recentMessage.media_url!)}
            />
          )}
          {recentMessage.type === 'video' && (
            <div
              className="w-16 h-16 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition flex items-center justify-center relative overflow-hidden"
              onClick={() => handleMediaClick('video', recentMessage.media_url!)}
            >
              <video src={recentMessage.media_url} className="absolute inset-0 w-full h-full object-cover" />
              <Play className="w-8 h-8 text-white relative z-10" />
            </div>
          )}
          {recentMessage.type === 'voice' && (
            <div
              className="w-16 h-16 bg-purple-600 rounded cursor-pointer hover:bg-purple-700 transition flex items-center justify-center"
              onClick={() => handleMediaClick('voice', recentMessage.media_url!)}
            >
              <Play className="w-8 h-8 text-white" />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const navButtons = [
    { id: 'mixtape', name: 'Mixtape', iconSrc: '/images/MusicIcon.png' },
    { id: 'map', name: 'Map', iconSrc: '/images/MapIcon.png' },
    { id: 'images', name: 'Album', iconSrc: '/images/AlbumIcon.png' },
    { id: 'messages', name: 'Messages', iconSrc: '/images/MessagesIcon.png' },
    { id: 'watching', name: 'Watching', iconSrc: '/images/watchingIcon.png' },
    { id: 'vision', name: 'Vision', iconSrc: '/images/CalendarIcon.png' },
  ];

  const ButtonBox = ({ id, name, iconSrc }: typeof navButtons[0]) => (
    <button
        onClick={() => setPage(id)}
        className="block"
    >
      <img
        src={iconSrc}
        alt={name}
        className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 block"
      />
    </button>
  );

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-7xl space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div onClick={() => setPage('map')} className="cursor-pointer hover:scale-[1.02] transition-transform">
              <InfoBoxContainer><TimeBox /></InfoBoxContainer>
            </div>
            <InfoBoxContainer><CountdownBox /></InfoBoxContainer>
            <InfoBoxContainer><MessageBox /></InfoBoxContainer>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-8 md:gap-12 justify-items-center">
            {navButtons.map((button, index) => (
              <ButtonBox key={index} {...button} />
            ))}
          </div>
        </div>
      </div>

      {/* Media Modal */}
      {showMediaModal && mediaModalUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowMediaModal(false)}
            className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="max-w-4xl w-full">
            {mediaModalType === 'image' && (
              <img
                src={mediaModalUrl}
                alt="Full size"
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
            )}
            {mediaModalType === 'video' && (
              <video
                src={mediaModalUrl}
                controls
                autoPlay
                className="w-full h-auto max-h-[90vh] rounded-lg"
              />
            )}
            {mediaModalType === 'voice' && (
              <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center justify-center">
                <div className="w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center mb-6">
                  <Play className="w-16 h-16 text-white" />
                </div>
                <audio
                  src={mediaModalUrl}
                  controls
                  autoPlay
                  className="w-full max-w-md"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// =========================================================================
// MAIN DASHBOARD COMPONENT
// =========================================================================

export default function Dashboard({ setCurrentPage, onLogout }: { setCurrentPage: (page: string) => void; onLogout?: () => void }) {
    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Settings and Logout buttons - top right */}
            <div className="fixed top-4 right-4 z-10 flex items-center space-x-2">
                <button
                    onClick={() => setCurrentPage('settings')}
                    className="flex items-center justify-center p-2 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition border border-gray-700"
                >
                    <Settings className="w-5 h-5" />
                </button>
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="flex items-center justify-center p-2 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition border border-gray-700"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="max-w-7xl mx-auto">
                <DashboardContent setPage={setCurrentPage} />
            </div>
        </div>
    );
}