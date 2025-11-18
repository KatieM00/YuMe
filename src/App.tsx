import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Mixtape from './pages/Mixtape';
import Map from './pages/Map';
import Images from './pages/Images';
import Messages from './pages/Messages';
import Watching from './pages/Watching';
import FutureHopes from './pages/FutureHopes';
import Navbar from './components/Navbar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const auth = localStorage.getItem('yumeAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem('yumeAuth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('yumeAuth');
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
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
      case 'future-hopes':
        return <FutureHopes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} />
      <main className="pt-16">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
