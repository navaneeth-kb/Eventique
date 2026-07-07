import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { db } from '../../firebaseConfig';
import { 
  UserGroupIcon, 
  CalendarIcon, 
  BriefcaseIcon, 
  CircleStackIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const ADMIN_EMAIL = 'admin@eventique.com';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [organisers, setOrganisers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'events' | 'students' | 'organisers'>('events');

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    // Security redirect
    if (!user || user.email !== ADMIN_EMAIL) {
      navigate('/OrganiserHomePage');
      return;
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Organisers
      const orgSnap = await getDocs(collection(db, 'organizers'));
      const orgData = orgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrganisers(orgData);

      // Fetch Students
      const userSnap = await getDocs(collection(db, 'users'));
      const userData = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(userData);

      // Fetch Events
      const eventSnap = await getDocs(collection(db, 'event'));
      const eventData = eventSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventData);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      alert('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${collectionName.replace(/s$/, '')}?`)) return;
    
    try {
      await deleteDoc(doc(db, collectionName, id));
      
      // Update local state
      if (collectionName === 'organizers') {
        setOrganisers(prev => prev.filter(item => item.id !== id));
      } else if (collectionName === 'users') {
        setStudents(prev => prev.filter(item => item.id !== id));
      } else if (collectionName === 'event') {
        setEvents(prev => prev.filter(item => item.id !== id));
      }
      
    } catch (error) {
      console.error(`Error deleting from ${collectionName}:`, error);
      alert('Failed to delete item.');
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><p className="text-xl font-semibold text-gray-500">Loading Dashboard...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-2">Manage all platform data centrally.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div 
          onClick={() => setActiveTab('events')}
          className={`bg-white rounded-xl shadow-sm border p-6 flex items-center cursor-pointer transition-all hover:shadow-md ${activeTab === 'events' ? 'border-[#246D8C] ring-1 ring-[#246D8C]' : 'border-gray-200'}`}
        >
          <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mr-4">
            <CalendarIcon className="h-7 w-7 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Events</p>
            <h3 className="text-3xl font-bold text-gray-900">{events.length}</h3>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('students')}
          className={`bg-white rounded-xl shadow-sm border p-6 flex items-center cursor-pointer transition-all hover:shadow-md ${activeTab === 'students' ? 'border-[#246D8C] ring-1 ring-[#246D8C]' : 'border-gray-200'}`}
        >
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mr-4">
            <UserGroupIcon className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Students</p>
            <h3 className="text-3xl font-bold text-gray-900">{students.length}</h3>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('organisers')}
          className={`bg-white rounded-xl shadow-sm border p-6 flex items-center cursor-pointer transition-all hover:shadow-md ${activeTab === 'organisers' ? 'border-[#246D8C] ring-1 ring-[#246D8C]' : 'border-gray-200'}`}
        >
          <div className="h-14 w-14 rounded-full bg-purple-100 flex items-center justify-center mr-4">
            <BriefcaseIcon className="h-7 w-7 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Organisers</p>
            <h3 className="text-3xl font-bold text-gray-900">{organisers.length}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center opacity-70">
          <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mr-4">
            <CircleStackIcon className="h-7 w-7 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Storage Used</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1">N/A*</h3>
            <p className="text-xs text-gray-400 mt-1">*Requires Admin SDK</p>
          </div>
        </div>
      </div>

      {/* Data Table section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 capitalize">{activeTab} List</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                {activeTab !== 'events' && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>}
                {activeTab === 'students' && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch/Batch</th>}
                {activeTab === 'events' && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Organiser</th>}
                {activeTab === 'events' && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>}
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {activeTab === 'events' && events.map(event => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{event.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{event.organiser}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{event.event_date || event.event_Date || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => handleDelete('event', event.id)}
                      className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-md transition-colors"
                      title="Delete Event"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {activeTab === 'students' && students.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.branch} - {student.batch}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => handleDelete('users', student.id)}
                      className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-md transition-colors"
                      title="Delete Student Database Record"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}

              {activeTab === 'organisers' && organisers.map(org => (
                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{org.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{org.email || org.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => handleDelete('organizers', org.id)}
                      className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-md transition-colors"
                      title="Delete Organiser Database Record"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Empty States */}
              {activeTab === 'events' && events.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No events found</td></tr>
              )}
              {activeTab === 'students' && students.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No students found</td></tr>
              )}
              {activeTab === 'organisers' && organisers.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No organisers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
