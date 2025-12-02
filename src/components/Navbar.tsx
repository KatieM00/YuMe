import { Settings, LogOut } from 'lucide-react';
import HomeIcon from '../images/HomeIcon.png';
import MusicIcon from '../images/MusicIcon.png';
import MapIcon from '../images/MapIcon.png';
import AlbumIcon from '../images/AlbumIcon.png';
import MessagesIcon from '../images/MessagesIcon.png';
import WatchingIcon from '../images/watchingIcon.png';
import CalendarIcon from '../images/CalendarIcon.png';
import YuMeIcon from '../images/YuMeIcon.png';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
}

export default function Navbar({ currentPage, setCurrentPage, onLogout }: NavbarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', iconSrc: HomeIcon },
    { id: 'mixtape', label: 'Mixtape', iconSrc: MusicIcon },
    { id: 'map', label: 'Map', iconSrc: MapIcon },
    { id: 'images', label: 'Images', iconSrc: AlbumIcon },
    { id: 'messages', label: 'Messages', iconSrc: MessagesIcon },
    { id: 'watching', label: 'Watching', iconSrc: WatchingIcon },
    { id: 'vision', label: 'Vision', iconSrc: CalendarIcon },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <img src={YuMeIcon} alt="YuMe" className="w-6 h-6" />
              <span className="text-xl font-bold text-white">YuMe</span>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <img src={item.iconSrc} alt={item.label} className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage('settings')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                currentPage === 'settings'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden border-t border-gray-800 bg-black/95">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs transition ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <img src={item.iconSrc} alt={item.label} className="w-5 h-5 mb-1" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
