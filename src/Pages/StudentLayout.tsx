import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, TicketIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import logo from '../assets/logo.svg';

/**
 * Persistent layout wrapper for student-facing pages.
 * Provides the bottom navigation bar (mobile) and sidebar (desktop)
 * that stays visible across all nested routes.
 */
const StudentLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName);
      } else {
        setUserName('Guest');
      }
    });
    return () => unsubscribe();
  }, []);

  // Determine active tab from current URL path
  const getActiveTab = (): string => {
    const path = location.pathname;
    if (path.includes('/Profile') || path.includes('/EditProfile')) return 'profile';
    if (path.includes('/TicketView')) return 'tickets';
    if (path.includes('/Months')) return 'months';
    // Event detail pages and HomePage itself are all under 'home'
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: string) => {
    switch (tab) {
      case 'home':
        navigate('/HomePage');
        break;
      case 'tickets':
        navigate('/HomePage/TicketView');
        break;
      case 'months':
        navigate('/HomePage/Months');
        break;
      case 'profile':
        navigate('/HomePage/Profile');
        break;
    }
  };

  const renderDesktopNavigation = () => (
    <div className="w-64 h-screen bg-white border-r border-gray-200 fixed left-0 top-0 p-6 flex flex-col z-50">
      <div className="mb-8 flex items-center gap-3">
        <img src={logo} alt="Eventique Logo" className="h-8 w-auto" />
        <h1 className="text-2xl font-bold text-[#246D8C]">Eventique</h1>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <button 
              onClick={() => handleTabClick('home')} 
              className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'home' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <HomeIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Home</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabClick('tickets')} 
              className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'tickets' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <TicketIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Pass</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabClick('months')} 
              className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'months' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <CalendarIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">My Events</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabClick('profile')} 
              className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'profile' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <UserIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Profile</span>
            </button>
          </li>
        </ul>
      </nav>
      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 font-bold">
            {userName ? userName.charAt(0) : 'G'}
          </div>
          <div className="ml-3">
            <p className="font-medium">{userName || 'Guest'}</p>
            <p className="text-xs text-gray-500">Account Settings</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMobileNavigation = () => (
    <div className="fixed bottom-0 w-full bg-white flex justify-around items-center h-16 border-t border-gray-200 z-50">
      <button 
        onClick={() => handleTabClick('home')} 
        className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <HomeIcon className="h-6 w-6" />
        <span className="text-xs mt-1">Home</span>
      </button>
      <button 
        onClick={() => handleTabClick('tickets')} 
        className={`flex flex-col items-center p-2 ${activeTab === 'tickets' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <TicketIcon className="h-6 w-6" />
        <span className="text-xs mt-1">Pass</span>
      </button>
      <button 
        onClick={() => handleTabClick('months')} 
        className={`flex flex-col items-center p-2 ${activeTab === 'months' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <CalendarIcon className="h-6 w-6" />
        <span className="text-xs mt-1">My Events</span>
      </button>
      <button 
        onClick={() => handleTabClick('profile')} 
        className={`flex flex-col items-center p-2 ${activeTab === 'profile' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <UserIcon className="h-6 w-6" />
        <span className="text-xs mt-1">Profile</span>
      </button>
    </div>
  );

  return (
    <div className="w-full h-screen flex flex-col bg-[#f6fcf7]">
      {isDesktop && renderDesktopNavigation()}
      
      {!isDesktop && (
        <div className="bg-white border-b border-gray-200 h-14 flex items-center px-4 shrink-0 z-40 sticky top-0">
          <img src={logo} alt="Eventique Logo" className="h-6 w-auto mr-2" />
          <h1 className="text-lg font-bold text-[#246D8C]">Eventique</h1>
        </div>
      )}

      <div className={`flex-1 w-full overflow-y-auto ${isDesktop ? 'pl-64' : 'pb-16'}`}>
        <Outlet />
      </div>

      {!isDesktop && renderMobileNavigation()}
    </div>
  );
};

export default StudentLayout;
