import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
// @ts-ignore
import { db } from '../firebaseConfig';
import { ArrowDownTrayIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Feedback {
  email: string;
  rating: number; // backward compatibility
  comment: string; // backward compatibility
  timestamp: any;
  userName: string;
  gender?: string;
  q1Rec?: number;
  q2Rate?: string;
  q3Info?: string;
  q4Dur?: string;
  q5Sat?: string;
  q6Learn?: string;
  q7Comment?: string;
}

const OrganiserFeedbackDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [eventData, setEventData] = useState<any>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // @ts-ignore
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const docRef = doc(db, 'event', id!);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setEventData(data);
          if (data.feedback) {
            setFeedback(data.feedback);
          }
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id]);

  const downloadFeedbackCSV = () => {
    if (feedback.length === 0) {
      alert('No feedback available to download');
      return;
    }

    const headers = ['Timestamp', 'Name', 'Email', 'Gender', 'Q1 (Recommend)', 'Q2 (Rating)', 'Q3 (Info)', 'Q4 (Duration)', 'Q5 (Satisfaction)', 'Q6 (Learnings)', 'Q7 (Comments)'];
    const csvRows = [];

    // Add headers
    csvRows.push(headers.map(h => `"${h}"`).join(','));

    // Add data rows
    for (const item of feedback) {
      const q1 = item.q1Rec !== undefined ? item.q1Rec : (item.rating ? item.rating * 2 : 'N/A');
      const q7 = item.q7Comment || item.comment || '';
      
      const row = [
        item.timestamp?.toDate().toLocaleString() || 'Unknown date',
        item.userName || 'Anonymous',
        item.email,
        item.gender || 'N/A',
        q1,
        item.q2Rate || 'N/A',
        item.q3Info || 'N/A',
        item.q4Dur || 'N/A',
        item.q5Sat || 'N/A',
        item.q6Learn || 'N/A',
        q7.replace(/"/g, '""')
      ].map(field => `"${field}"`);
      
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${eventData?.name.replace(/[^a-z0-9]/gi, '_')}_feedback.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFeedbackPDF = () => {
    if (feedback.length === 0) {
      alert('No feedback available to download');
      return;
    }

    // Use landscape orientation for spreadsheet view
    const pdf = new jsPDF('landscape');
    
    // Set document properties
    pdf.setProperties({
      title: `${eventData?.name} Feedback Report`,
      subject: 'Event Feedback',
      author: 'Event Management System',
      keywords: 'feedback, event, ' + eventData?.name
    });

    // Add title
    pdf.setFontSize(18);
    pdf.setTextColor(0, 51, 102);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${eventData?.name} - Feedback Report`, pdf.internal.pageSize.width / 2, 20, { align: 'center' });

    // Add subtitle
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pdf.internal.pageSize.width / 2, 28, { align: 'center' });

    // Prepare table data
    const tableColumn = ['Timestamp', 'Name', 'Email', 'Gender', 'Q1 (Rec)', 'Q2 (Rate)', 'Q3 (Info)', 'Q4 (Dur)', 'Q5 (Sat)', 'Q6 (Learn)', 'Q7 (Comment)'];
    const tableRows: any[][] = [];

    feedback.forEach(item => {
      const q1 = item.q1Rec !== undefined ? item.q1Rec : (item.rating ? item.rating * 2 : 'N/A');
      const q7 = item.q7Comment || item.comment || '';
      
      const rowData = [
        item.timestamp?.toDate().toLocaleString() || 'Unknown date',
        item.userName || 'Anonymous',
        item.email,
        item.gender || 'N/A',
        q1 !== 'N/A' ? `${q1}/10` : 'N/A',
        item.q2Rate || 'N/A',
        item.q3Info || 'N/A',
        item.q4Dur || 'N/A',
        item.q5Sat || 'N/A',
        item.q6Learn || 'N/A',
        q7
      ];
      tableRows.push(rowData);
    });

    autoTable(pdf, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        10: { cellWidth: 50 } // Give more width to the comment column
      },
      margin: { top: 35 }
    });

    pdf.save(`${eventData?.name.replace(/[^a-z0-9]/gi, '_')}_feedback.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 min-h-screen bg-[#e9f7f1]">
      <div className="mb-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{eventData?.name || 'Event Feedback'}</h1>
              <p className="opacity-90">Participant Feedback</p>
            </div>
           
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {feedback.length} Feedback Entries
            </h2>
            <div className="flex gap-2">
              <button
                onClick={downloadFeedbackCSV}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download CSV
              </button>
              <button
                onClick={downloadFeedbackPDF}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download PDF
              </button>
            </div>
          </div>

          {feedback.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No feedback has been submitted for this event yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Timestamp</th>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Gender</th>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Q1 (Recommend)</th>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Q2 (Rating)</th>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Q3 (Info)</th>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Q4 (Duration)</th>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Q5 (Satisfaction)</th>
                    <th className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Q6 (Learnings)</th>
                    <th className="px-4 py-3 font-medium text-gray-700 min-w-[200px]">Q7 (Comments)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feedback.map((item, index) => {
                    const q1 = item.q1Rec !== undefined ? item.q1Rec : (item.rating ? item.rating * 2 : 'N/A');
                    const q7 = item.q7Comment || item.comment || '';
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {item.timestamp?.toDate().toLocaleString() || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                          {item.userName || 'Anonymous'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {item.email}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {item.gender || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {q1 !== 'N/A' ? `${q1}/10` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {item.q2Rate || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {item.q3Info || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {item.q4Dur || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {item.q5Sat || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {item.q6Learn || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs italic bg-gray-50/50">
                          {q7 ? `"${q7}"` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganiserFeedbackDetails;