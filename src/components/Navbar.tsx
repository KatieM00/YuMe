import { useState, useEffect } from 'react';
import { Settings, LogOut, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
}

export default function Navbar({ currentPage, setCurrentPage, onLogout }: NavbarProps) {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', iconSrc: '/images/HomeIcon.png' },
    { id: 'mixtape', label: 'Mixtape', iconSrc: '/images/MusicIcon.png' },
    { id: 'map', label: 'Map', iconSrc: '/images/MapIcon.png' },
    { id: 'images', label: 'Images', iconSrc: '/images/AlbumIcon.png' },
    { id: 'messages', label: 'Messages', iconSrc: '/images/MessagesIcon.png' },
    { id: 'watching', label: 'Watching', iconSrc: '/images/watchingIcon.png' },
    { id: 'vision', label: 'Vision', iconSrc: '/images/CalendarIcon.png' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 100) {
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsNavVisible(false);
        setIsMobileMenuOpen(false);
      } else {
        // Scrolling up
        setIsNavVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <nav className={`fixed top-4 left-0 right-0 z-50 transform ${isNavVisible ? 'translate-y-0' : '-translate-y-full'} transition-transform duration-300 ease-in-out`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img src="/images/YuMeIcon.png" alt="YuMe" className="w-6 h-6" />
                <span className="text-xl font-bold text-white">YuMe</span>
              </div>

              <div className="hidden md:flex items-center space-x-2">
                {navItems.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`p-2 rounded-lg transition ${
                        isActive
                          ? 'bg-blue-500/20'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <img src={item.iconSrc} alt={item.label} className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Desktop: Settings and Logout */}
              <button
                onClick={() => setCurrentPage('settings')}
                className="hidden md:flex items-center justify-center p-2 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition border border-gray-700"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={onLogout}
                className="hidden md:flex items-center justify-center p-2 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition border border-gray-700"
              >
                <LogOut className="w-5 h-5" />
              </button>

              {/* Mobile: Hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden flex items-center justify-center p-2 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition border border-gray-700"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="md:hidden fixed top-0 right-0 h-full w-64 bg-gray-900 border-l border-gray-800 z-50 transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full pt-20 pb-6 px-4">
              {/* Navigation Items */}
              <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentPage(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <img src={item.iconSrc} alt={item.label} className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Settings and Logout */}
              <div className="space-y-2 pt-4 border-t border-gray-800">
                <button
                  onClick={() => {
                    setCurrentPage('settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                    currentPage === 'settings'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
