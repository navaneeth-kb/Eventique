import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, PlusIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import logo from '../assets/logo.svg';

/**
 * Persistent layout wrapper for organiser-facing pages.
 * Provides the bottom navigation bar (mobile) and sidebar (desktop)
 * that stays visible across all nested routes.
 */
const OrganiserLayout: React.FC = () => {
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
        setUserName('Organiser');
      }
    });
    return () => unsubscribe();
  }, []);

  // Determine active tab from current URL path
  const getActiveTab = (): string => {
    const path = location.pathname;
    if (path.includes('/OrganiserProfile')) return 'profile';
    if (path.includes('/OrganiserCalendar')) return 'events';
    if (path.includes('/EventCreation')) return 'create';
    // Event detail pages and OrganiserHomePage itself are all under 'home'
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: string) => {
    switch (tab) {
      case 'home':
        navigate('/OrganiserHomePage');
        break;
      case 'create':
        navigate('/OrganiserHomePage/EventCreation');
        break;
      case 'events':
        navigate('/OrganiserCalendar');
        break;
      case 'profile':
        navigate('/OrganiserProfile');
        break;
    }
  };

  const renderDesktopNavigation = () => (
    <div className="w-64 h-screen bg-white border-r border-gray-200 fixed left-0 top-0 p-6 flex flex-col z-50">
      <div className="mb-8 flex items-start gap-3">
        <img src={logo} alt="Eventique Logo" className="h-8 w-auto mt-0.5" />
        <div>
          <h1 className="text-2xl font-bold text-[#246D8C] leading-none">Eventique</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-semibold">Organiser</p>
        </div>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <button 
              onClick={() => handleTabClick('home')} 
              className={`flex items-center w-full p-3 rounded-lg transition-colors ${activeTab === 'home' ? 'bg-[#246D8C]/10 text-[#246D8C]' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <HomeIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Home</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabClick('create')} 
              className={`flex items-center w-full p-3 rounded-lg transition-colors ${activeTab === 'create' ? 'bg-[#246D8C]/10 text-[#246D8C]' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <PlusIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Create Event</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabClick('events')} 
              className={`flex items-center w-full p-3 rounded-lg transition-colors ${activeTab === 'events' ? 'bg-[#246D8C]/10 text-[#246D8C]' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <CalendarIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Calendar</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabClick('profile')} 
              className={`flex items-center w-full p-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-[#246D8C]/10 text-[#246D8C]' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <UserIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Profile</span>
            </button>
          </li>
        </ul>
      </nav>
      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#246D8C]/20 flex items-center justify-center text-[#246D8C] font-bold">
            {userName ? userName.charAt(0) : 'O'}
          </div>
          <div className="ml-3">
            <p className="font-medium text-sm line-clamp-1">{userName || 'Organiser'}</p>
            <p className="text-xs text-gray-500">Dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMobileNavigation = () => (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-white flex justify-around items-center h-16 border-t border-gray-200 z-50">
      <button 
        onClick={() => handleTabClick('home')} 
        className={`flex flex-col items-center p-2 w-1/4 ${activeTab === 'home' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <HomeIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="text-xs sm:text-sm mt-1">Home</span>
      </button>
      <button 
        onClick={() => handleTabClick('create')} 
        className={`flex flex-col items-center p-2 w-1/4 ${activeTab === 'create' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <PlusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="text-xs sm:text-sm mt-1">Create</span>
      </button>
      <button 
        onClick={() => handleTabClick('events')} 
        className={`flex flex-col items-center p-2 w-1/4 ${activeTab === 'events' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="text-xs sm:text-sm mt-1">Events</span>
      </button>
      <button 
        onClick={() => handleTabClick('profile')} 
        className={`flex flex-col items-center p-2 w-1/4 ${activeTab === 'profile' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <UserIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="text-xs sm:text-sm mt-1">Profile</span>
      </button>
    </div>
  );

  return (
    <div className="w-full h-screen flex flex-col bg-[#f6fcf7]">
      {isDesktop && renderDesktopNavigation()}
      
      {!isDesktop && (
        <div className="bg-white border-b border-gray-200 h-14 flex items-center px-4 shrink-0 z-40 sticky top-0">
          <img src={logo} alt="Eventique Logo" className="h-6 w-auto mr-2" />
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-bold text-[#246D8C] leading-none">Eventique</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 font-semibold">Organiser</p>
          </div>
        </div>
      )}

      <div className={`flex-1 w-full overflow-y-auto ${isDesktop ? 'ml-64' : 'pb-16'}`}>
        <Outlet />
      </div>

      {!isDesktop && renderMobileNavigation()}
    </div>
  );
};

export default OrganiserLayout;
