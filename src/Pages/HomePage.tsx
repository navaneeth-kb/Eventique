import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { UserIcon, CalendarIcon } from '@heroicons/react/24/outline';
import hi from '../assets/Home/hi.svg';
import { format } from 'date-fns';
import { Link, useLocation } from 'react-router-dom';

const db = getFirestore();

const HomePage: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeEventTab, setActiveEventTab] = useState<'current' | 'past'>('current');
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'event'));

      if (querySnapshot.empty) {
        setError('No events available');
        setLoading(false);
        return;
      }

      const eventsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const eventId = doc.id;
        const eventDate = data['Event Date'] ? new Date(data['Event Date']) : null;
        const formattedDate = eventDate ? format(eventDate, 'dd-MM-yyyy') : 'N/A';
        const isClosed = data.status === 'closed';

        return {
          id: eventId,
          ...data,
          Event_Date: formattedDate,
          rawDate: eventDate,
          isClosed
        };
      });

      const current = eventsData.filter(event => !event.isClosed);
      const past = eventsData.filter(event => event.isClosed);

      setEvents(eventsData);
      setCurrentEvents(current);
      setPastEvents(past);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName);
      } else {
        setUserName('Guest');
      }
    });

    fetchEvents();

    if (location.state?.shouldRefresh) {
      fetchEvents();
      window.history.replaceState({}, document.title);
    }

    return () => unsubscribe();
  }, [location.state]);

  useEffect(() => {
    const filterEvents = (eventList: any[]) => {
      return eventList.filter((event) =>
        event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organiser?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    };

    if (activeEventTab === 'current') {
      setCurrentEvents(filterEvents(events.filter(event => !event.isClosed)));
    } else {
      setPastEvents(filterEvents(events.filter(event => event.isClosed)));
    }
  }, [searchQuery, events, activeEventTab]);

  return (
    <div className={`p-4 flex flex-col items-center ${isDesktop ? '' : ''}`}>
      {/* Welcome Section */}
      <div className={`relative mb-6 w-full ${isDesktop ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {isDesktop ? (
          <div className="flex items-center p-8 bg-[#246d8c] rounded-2xl shadow-xl">
            <div className="flex-1 text-white">
              <h1 className="text-4xl font-bold leading-snug">Welcome back</h1>
              <h2 className="text-5xl font-extrabold leading-snug">
                {userName ? userName : 'Loading...'}
              </h2>
              <p className="mt-2 text-blue-100 max-w-xl">
                Discover and manage events all in one place.
              </p>
            </div>
            <img src={hi} alt="App logo" className="h-48 ml-4" />
          </div>
        ) : (
          <>
            <img src={hi} alt="App logo" className="mb-8" />
            <div className="absolute top-0 left-4 mt-4 text-white">
              <h1 className="text-2xl md:text-3xl font-bold leading-snug">Welcome back</h1>
              <h2 className="text-3xl md:text-4xl font-extrabold leading-snug">
                {userName ? userName : 'Loading...'}
              </h2>
            </div>
          </>
        )}
      </div>

      {/* Search and Tabs Container */}
      <div className={`w-full ${isDesktop ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {/* Search Input Field */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Events Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              className={`py-2 px-6 font-medium ${activeEventTab === 'current' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveEventTab('current')}
            >
              Current Events
            </button>
            <button
              className={`py-2 px-6 font-medium ${activeEventTab === 'past' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveEventTab('past')}
            >
              Past Events
            </button>
          </div>
        </div>

        {/* Events List */}
        <div className="w-full">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          ) : activeEventTab === 'current' ? (
            currentEvents.length === 0 ? (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-blue-700">No current events available</p>
              </div>
            ) : (
              <div className={`grid gap-6 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {currentEvents.map((event, index) => (
                  <Link 
                    key={index} 
                    to={`/event/${event.id}`}
                    state={{ fromHome: true }}
                  >
                    <div className="bg-white rounded-lg p-4 h-full shadow-lg hover:shadow-xl transition-shadow">
                      <div className="w-full aspect-square overflow-hidden rounded-md mb-4">
                        <img 
                          src={event.poster} 
                          alt={event.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="text-xl font-semibold mb-2">{event.name}</h4>
                      <div className="flex items-center text-gray-600 mb-1">
                        <UserIcon className="h-4 w-4 mr-2" />
                        <span>{event.organiser}</span>
                      </div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <span>{event.Event_Date}</span>
                      </div>
                      <div className="text-gray-600">{event.venue}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : pastEvents.length === 0 ? (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-blue-700">No past events available</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {pastEvents.map((event, index) => (
                <Link 
                  key={index} 
                  to={`/event/${event.id}`}
                  state={{ fromHome: true }}
                >
                  <div className="bg-gray-50 rounded-lg p-4 h-full shadow hover:shadow-md transition-shadow">
                    <div className="w-full aspect-square overflow-hidden rounded-md mb-4">
                      <img 
                        src={event.poster} 
                        alt={event.name} 
                        className="w-full h-full object-cover opacity-80" 
                      />
                    </div>
                    <h4 className="text-xl font-semibold mb-2 text-gray-700">{event.name}</h4>
                    <div className="flex items-center text-gray-500 mb-1">
                      <UserIcon className="h-4 w-4 mr-2" />
                      <span>{event.organiser}</span>
                    </div>
                    <div className="flex items-center text-gray-500 mb-1">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span>{event.Event_Date}</span>
                    </div>
                    <div className="text-gray-500">{event.venue}</div>
                    <div className="mt-2 inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                      Event Closed
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;