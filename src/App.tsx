import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Mixtape from './pages/Mixtape';
import Map from './pages/Map';
import Images from './pages/Images';
import Messages from './pages/Messages';
import Watching from './pages/Watching';
import Vision from './pages/Vision';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';
import SpotifyMiniPlayer from './components/SpotifyMiniPlayer';
import { getCurrentSession, signOut, onAuthStateChange } from './lib/authService';
import { UserProvider } from './contexts/UserContext';
import { SpotifyPlayerProvider } from './contexts/SpotifyPlayerContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Check for existing session on mount
    getCurrentSession().then((session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const subscription = onAuthStateChange((user) => {
      setIsAuthenticated(!!user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Handle Spotify OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    if (path === '/settings' || params.get('spotify_connected') || params.get('spotify_error')) {
      setCurrentPage('settings');
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mb-4 animate-pulse">
            <span className="text-2xl">💕</span>
          </div>
          <p className="text-gray-400">Loading YuMe...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} onLogout={handleLogout} />;
      case 'mixtape':
        return <Mixtape />;
      case 'map':
        return <Map />;
      case 'images':
        return <Images />;
      case 'messages':
        return <Messages />;
      case 'watching':
        return <Watching />;
      case 'vision':
        return <Vision />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} onLogout={handleLogout} />;
    }
  };

  return (
    <UserProvider>
      <SpotifyPlayerProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
          {currentPage !== 'dashboard' && (
            <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} />
          )}
          <main>
            {renderPage()}
          </main>
          <SpotifyMiniPlayer />
        </div>
      </SpotifyPlayerProvider>
    </UserProvider>
  );
}

export default App;
