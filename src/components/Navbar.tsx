import { useState, useEffect } from 'react';
import { Settings, LogOut } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
}

export default function Navbar({ currentPage, setCurrentPage, onLogout }: NavbarProps) {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 100) {
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsNavVisible(false);
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
    <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 transform ${isNavVisible ? 'translate-y-0' : '-translate-y-20'} transition-transform duration-300 ease-in-out`}>
      <button
        onClick={() => setCurrentPage('settings')}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition border border-gray-700"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Settings</span>
      </button>
      <button
        onClick={onLogout}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition border border-gray-700"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );
}
