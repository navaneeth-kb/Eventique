import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { doc, getDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import { db } from '../firebaseConfig';

interface DietaryRecord {
  email: string;
  preference: string;
}

const OrganiserDietaryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [records, setRecords] = useState<DietaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDietaryDetails = async () => {
      if (!id) return;
      try {
        const eventRef = doc(db, 'event', id);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          const eventData = eventSnap.data();
          setEventName(eventData.name || 'Event');
          
          const preferencesMap = eventData.dietaryPreferences || {};
          const parsedRecords: DietaryRecord[] = Object.entries(preferencesMap).map(([emailKey, pref]) => ({
            email: emailKey.replace(/,/g, '.'),
            preference: pref as string
          }));
          
          // Sort by preference then email
          parsedRecords.sort((a, b) => {
            if (a.preference !== b.preference) return a.preference.localeCompare(b.preference);
            return a.email.localeCompare(b.email);
          });
          
          setRecords(parsedRecords);
        }
      } catch (error) {
        console.error('Error fetching dietary preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDietaryDetails();
  }, [id]);

  const vegCount = records.filter(r => r.preference === 'Veg').length;
  const nonVegCount = records.filter(r => r.preference === 'Non-Veg').length;

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(`${eventName} - Dietary Preferences`, 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    
    doc.text(`Total Records: ${records.length}`, 14, 35);
    doc.text(`Vegetarian: ${vegCount} | Non-Vegetarian: ${nonVegCount}`, 14, 42);
    
    const headers = [['Email', 'Dietary Preference']];
    const tableData = records.map(record => [record.email, record.preference]);
    
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 50,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    doc.save(`${eventName.replace(/[^a-z0-9]/gi, '_')}_dietary_preferences.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {eventName} - Dietary Preferences
          </h1>
        </div>
        <button
          onClick={downloadPDF}
          disabled={records.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${records.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#246d8c] hover:bg-indigo-700 text-white'}`}
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          <span>Export PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-gray-500 text-sm font-medium uppercase">Total</span>
          <span className="text-3xl font-bold text-gray-800">{records.length}</span>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100 flex flex-col items-center">
          <span className="text-green-600 text-sm font-medium uppercase">Vegetarian</span>
          <span className="text-3xl font-bold text-green-700">{vegCount}</span>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100 flex flex-col items-center">
          <span className="text-red-600 text-sm font-medium uppercase">Non-Vegetarian</span>
          <span className="text-3xl font-bold text-red-700">{nonVegCount}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dietary Preference</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length > 0 ? (
                records.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${record.preference === 'Veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {record.preference}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                    No dietary preferences recorded for this event yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrganiserDietaryDetails;
