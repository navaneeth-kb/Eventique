import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  QrCodeIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  LinkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { doc, getDoc, deleteDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
// @ts-ignore
import { db, storage } from '../firebaseConfig';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EventData {
  id: string;
  name: string;
  organiser: string;
  category: string;
  venue: string;
  event_date: string;
  event_time: string;
  poster: string;
  status?: string;
  registrationOpen?: boolean;
  num_of_participants?: number;
  attendees?: any[];
  Participants?: string[];
  paymentProofs?: { userEmail: string; proofURL: string; storagePath: string; timestamp: any }[];
  paymentEnabled?: boolean;
  upiQr?: string;
  coordinators?: { name: string; phone: string }[];
  description?: string;
}

const OrganiserEventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [isGeneratingAttendance, setIsGeneratingAttendance] = useState(false);

  // Report form state — all manually entered by the secretary
  const [, setReportPhoto] = useState<File | null>(null);
  const [reportPhotoPreview, setReportPhotoPreview] = useState('');
  const [reportDateWithTime, setReportDateWithTime] = useState('');
  const [reportVenue, setReportVenue] = useState('');
  const [reportParticipants, setReportParticipants] = useState('');
  const [reportFacultyIncharges, setReportFacultyIncharges] = useState('');
  const [hasSpeaker, setHasSpeaker] = useState(false);
  const [speakers, setSpeakers] = useState<{ name: string; designation: string }[]>([]);
  const [reportOverview, setReportOverview] = useState('');
  const [reportConclusion, setReportConclusion] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setEventData({
              id: docSnap.id,
              ...data,
              registrationOpen: data.registrationOpen !== false,
              event_date: data.event_date || data.event_Date,
              event_time: data.event_time || data.eventTime
            } as EventData);
          } else {
            setError('Event not found.');
          }
        } catch (error) {
          console.error('Error fetching event details:', error);
          setError('Failed to load event details.');
        } finally {
          setLoading(false);
        }
      };

      fetchEventDetails();
    } else {
      setError('Event ID is missing.');
      setLoading(false);
    }
  }, [id]);

  // Pre-fill some fields from event data when the report form is opened
  useEffect(() => {
    if (showReportForm && eventData) {
      setReportDateWithTime(
        `${eventData.event_date || ''}${eventData.event_time ? ' (' + eventData.event_time + ')' : ''}`
      );
      setReportVenue(eventData.venue || '');
    }
  }, [showReportForm, eventData]);

  const handleDelete = async () => {
    if (!id || !eventData) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this event? This will also permanently delete all associated posters, logos, and pending payment proofs.");
    if (!confirmDelete) return;

    try {
      // 1. Delete Poster
      if (eventData.poster) {
        try {
          const posterRef = ref(storage, eventData.poster);
          await deleteObject(posterRef);
        } catch (err) {
          console.error('Error deleting poster:', err);
        }
      }

      // 2. Delete Logos
      // @ts-ignore
      if (eventData.logos && Array.isArray(eventData.logos)) {
        // @ts-ignore
        for (const logoUrl of eventData.logos) {
          try {
            const logoRef = ref(storage, logoUrl);
            await deleteObject(logoRef);
          } catch (err) {
            console.error('Error deleting logo:', err);
          }
        }
      }

      // 3. Delete Pending Payment Proofs
      if (eventData.paymentProofs && Array.isArray(eventData.paymentProofs)) {
        for (const proof of eventData.paymentProofs) {
          if (proof.storagePath || proof.proofURL) {
            try {
              const proofRef = ref(storage, proof.storagePath || proof.proofURL);
              await deleteObject(proofRef);
            } catch (err) {
              console.error('Error deleting payment proof:', err);
            }
          }
        }
      }

      // 4. Delete UPI QR Code if exists
      if (eventData.upiQr) {
        try {
          const qrRef = ref(storage, eventData.upiQr);
          await deleteObject(qrRef);
        } catch (err) {
          console.error('Error deleting UPI QR:', err);
        }
      }

      // Finally, delete the Firestore document
      await deleteDoc(doc(db, 'event', id));
      alert("Event and all associated media deleted successfully!");
      navigate('/OrganiserHomePage');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert("Failed to delete event.");
    }
  };

  const handleCloseEvent = async () => {
    if (!id || !eventData) return;

    const confirmClose = window.confirm("Are you sure you want to close this event? This will:\n1. Move it to past events\n2. Close registration\n3. Remove it from current events");
    if (!confirmClose) return;

    try {
      const eventRef = doc(db, 'event', id);

      await updateDoc(eventRef, {
        status: 'closed',
        registrationOpen: false
      });

      setEventData({
        ...eventData,
        status: 'closed',
        registrationOpen: false
      });

      alert("Event closed successfully! Registration is closed.");
    } catch (error) {
      console.error('Error closing event:', error);
      alert("Failed to close event.");
    }
  };

  const handleApprovePayment = async (proof: any) => {
    if (!id || !eventData) return;
    
    try {
      const eventRef = doc(db, 'event', id);
      
      // Update firestore: add to Participants, remove from paymentProofs
      const updatedProofs = eventData.paymentProofs?.filter((p) => p.userEmail !== proof.userEmail) || [];
      const updatedParticipants = [...(eventData.Participants || []), proof.userEmail];
      
      await updateDoc(eventRef, {
        Participants: updatedParticipants,
        paymentProofs: updatedProofs
      });
      
      // Delete from storage
      if (proof.storagePath) {
        const fileRef = ref(storage, proof.storagePath);
        await deleteObject(fileRef).catch(console.error);
      }
      
      setEventData({
        ...eventData,
        Participants: updatedParticipants,
        paymentProofs: updatedProofs
      });
      
      alert(`Successfully verified and registered ${proof.userEmail}`);
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Failed to approve payment.');
    }
  };

  const handleRejectPayment = async (proof: any) => {
    if (!id || !eventData) return;
    
    if (!window.confirm(`Are you sure you want to reject payment for ${proof.userEmail}? This will delete their proof.`)) return;
    
    try {
      const eventRef = doc(db, 'event', id);
      
      // Update firestore: remove from paymentProofs
      const updatedProofs = eventData.paymentProofs?.filter((p) => p.userEmail !== proof.userEmail) || [];
      
      await updateDoc(eventRef, {
        paymentProofs: updatedProofs
      });
      
      // Delete from storage
      if (proof.storagePath) {
        const fileRef = ref(storage, proof.storagePath);
        await deleteObject(fileRef).catch(console.error);
      }
      
      setEventData({
        ...eventData,
        paymentProofs: updatedProofs
      });
      
      alert(`Rejected payment for ${proof.userEmail}`);
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment.');
    }
  };

  const handleReportPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReportPhoto(file);
      setReportPhotoPreview(URL.createObjectURL(file));
    }
  };

  const addSpeaker = () => {
    setSpeakers([...speakers, { name: '', designation: '' }]);
  };

  const removeSpeaker = (index: number) => {
    setSpeakers(speakers.filter((_, i) => i !== index));
  };

  const updateSpeaker = (index: number, field: 'name' | 'designation', value: string) => {
    const updated = [...speakers];
    updated[index][field] = value;
    setSpeakers(updated);
  };

  const handleGenerateReport = () => {
    // Validate required fields
    if (!reportDateWithTime.trim()) return alert('Please enter the date and time.');
    if (!reportVenue.trim()) return alert('Please enter the venue.');
    if (!reportParticipants.trim()) return alert('Please enter participant details.');
    if (!reportFacultyIncharges.trim()) return alert('Please enter faculty incharges.');
    if (!reportOverview.trim()) return alert('Please write the event overview.');
    if (!reportConclusion.trim()) return alert('Please write the conclusion.');
    if (hasSpeaker && speakers.length === 0) return alert('Please add at least one speaker or turn off the speaker toggle.');
    if (hasSpeaker && speakers.some(s => !s.name.trim() || !s.designation.trim())) {
      return alert('Please fill in all speaker names and designations.');
    }

    setReportReady(true);
    setShowReportForm(false);
  };

  const copyToClipboard = () => {
    // Generate text version for clipboard
    const textReport = `Event Report: ${eventData?.name}\n\nOverview: ${reportOverview}\n\nVenue: ${reportVenue}\nDate/Time: ${reportDateWithTime}\nParticipants: ${reportParticipants}\nFaculty: ${reportFacultyIncharges}\n${hasSpeaker ? 'Speakers: ' + speakers.map(s => `${s.name} (${s.designation})`).join(', ') : ''}\n\nConclusion: ${reportConclusion}`;
    navigator.clipboard.writeText(textReport);
    alert('Report copied to clipboard!');
  };

  const downloadPDF = async () => {
    if (!eventData) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 25;
    const contentWidth = pageWidth - margin * 2;

    pdf.setProperties({
      title: `Event Report: ${eventData.name}`,
      subject: 'Event Report',
      author: eventData.organiser,
      creator: 'Eventique'
    });

    // --- Title ---
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(`Event Report: ${eventData.name}`, contentWidth);
    pdf.text(titleLines, pageWidth / 2, 25, { align: 'center' });
    let y = 25 + titleLines.length * 9;

    // --- Geotagged Photo ---
    if (reportPhotoPreview) {
      try {
        const dataUrl = await getBase64ImageFromUrl(reportPhotoPreview);
        const imgProps = pdf.getImageProperties(dataUrl);
        const imgWidth = contentWidth * 0.7;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        const imgX = (pageWidth - imgWidth) / 2;
        y += 5;
        pdf.addImage(dataUrl, 'JPEG', imgX, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      } catch (err) {
        console.error('Error adding photo to PDF:', err);
      }
    }

    // Helper to check page overflow
    const checkPage = (needed: number) => {
      if (y + needed > 275) { pdf.addPage(); y = 20; }
    };

    // --- Details Table ---
    const addLabelValue = (label: string, value: string) => {
      checkPage(12);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${label}:`, margin, y);
      pdf.setFont('helvetica', 'normal');
      const valLines = pdf.splitTextToSize(value, contentWidth - 65);
      pdf.text(valLines, margin + 60, y);
      y += Math.max(valLines.length * 6, 8);
    };

    y += 5;
    addLabelValue('DATE', reportDateWithTime);
    y += 3;
    addLabelValue('VENUE', reportVenue);
    y += 3;
    addLabelValue('TOTAL PARTICIPANTS', reportParticipants);
    y += 3;
    addLabelValue('FACULTY INCHARGES', reportFacultyIncharges);

    if (hasSpeaker && speakers.length > 0) {
      y += 3;
      speakers.forEach((speaker, idx) => {
        addLabelValue(speakers.length === 1 ? 'RESOURCE PERSON' : `RESOURCE PERSON ${idx + 1}`, speaker.name);
        checkPage(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.text(`(${speaker.designation})`, margin + 60, y);
        y += 8;
      });
    }

    // --- Horizontal line ---
    y += 5;
    checkPage(10);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    // --- EVENT OVERVIEW ---
    checkPage(15);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('EVENT OVERVIEW:', margin, y);
    y += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const overviewParagraphs = reportOverview.split('\n').filter(p => p.trim());
    for (const para of overviewParagraphs) {
      const paraLines = pdf.splitTextToSize(para.trim(), contentWidth);
      checkPage(paraLines.length * 6 + 5);
      pdf.text(paraLines, margin, y);
      y += paraLines.length * 6 + 5;
    }

    // --- CONCLUSION ---
    y += 5;
    checkPage(15);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONCLUSION:', margin, y);
    y += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const conclusionParagraphs = reportConclusion.split('\n').filter(p => p.trim());
    for (const para of conclusionParagraphs) {
      const paraLines = pdf.splitTextToSize(para.trim(), contentWidth);
      checkPage(paraLines.length * 6 + 5);
      pdf.text(paraLines, margin, y);
      y += paraLines.length * 6 + 5;
    }

    // --- Footer ---
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generated via Eventique on ${new Date().toLocaleDateString()}`, pageWidth / 2, 290, { align: 'center' });

    pdf.save(`${eventData.name.replace(/[^a-z0-9]/gi, '_')}_Event_Report.pdf`);
  };

  // Helper function to convert image URL to base64
  const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const generateAttendanceList = async () => {
    if (!eventData || !eventData.attendees || eventData.attendees.length === 0) {
      alert("No attendees recorded for this event yet.");
      return;
    }

    setIsGeneratingAttendance(true);
    try {
      const usersCollection = collection(db, 'users');
      
      // Handle both legacy string arrays and new object arrays { email, timestamp }
      const attendeeEmails = eventData.attendees.map((a: any) => typeof a === 'string' ? a : a.email).filter(Boolean);

      const participantPromises = attendeeEmails.map(async (email: string) => {
        try {
          const q = query(usersCollection, where("email", "==", email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return userDoc.data();
          }
          return { email, name: 'User not found' };
        } catch (e) {
          console.error("Error fetching profile for attendance", email, e);
          return { email, name: 'Profile hidden' };
        }
      });
      
      const participantData = await Promise.all(participantPromises);
      
      // Generate PDF
      const pdf = new jsPDF();
      
      pdf.setFontSize(18);
      pdf.setTextColor(0, 51, 102);
      pdf.text(`${eventData.name || 'Event'} - Attendance List`, pdf.internal.pageSize.width / 2, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Date: ${eventData.event_date || 'N/A'}`, 14, 30);
      pdf.text(`Venue: ${eventData.venue || 'N/A'}`, 14, 38);

      const tableColumn = ['Sr Num', 'Class', 'UID', 'Name', 'Gender'];
      const tableRows: any[][] = [];

      participantData.forEach((user: any, index: number) => {
        const userClass = user.batch || user.branch || user.division ? `${user.branch || ''} ${user.batch || ''} ${user.division || ''}`.trim() : 'N/A';
        const rowData = [
          index + 1,
          userClass,
          user.uid || 'N/A',
          user.name || 'Anonymous',
          user.gender || 'N/A'
        ];
        tableRows.push(rowData);
      });

      autoTable(pdf, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
      });

      pdf.save(`${eventData.name.replace(/[^a-z0-9]/gi, '_')}_Attendance.pdf`);
    } catch (error) {
      console.error("Error generating attendance list:", error);
      alert("Failed to generate attendance list.");
    } finally {
      setIsGeneratingAttendance(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-40 bg-[#e9f7f1]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 bg-[#e9f7f1]">
      <p className="text-red-700">{error}</p>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-[#e9f7f1] min-h-screen">
      <div className="mb-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>
      {eventData ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Event Header */}
          <div className="bg-[#246d8c] p-6 text-white">
            <h1 className="text-2xl font-bold">{eventData.name}</h1>
            <p className="opacity-90">Organized by {eventData.organiser}</p>
          </div>

          {/* Event Content */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Event Poster */}
              <div className="w-full md:w-1/3">
                <img
                  src={eventData.poster}
                  alt={eventData.name}
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>

              {/* Event Details */}
              <div className="w-full md:w-2/3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-700">Date</h3>
                    <p>{eventData.event_date}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">Time</h3>
                    <p>{eventData.event_time || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">Venue</h3>
                    <p>{eventData.venue}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">Category</h3>
                    <p>{eventData.category}</p>
                  </div>
                </div>

                {eventData.description && (
                  <div>
                    <h3 className="font-semibold text-gray-700">Description</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{eventData.description}</p>
                  </div>
                )}

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {eventData.status === 'closed' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      Event Closed
                    </span>
                  )}
                  {eventData.registrationOpen === false && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      Registration Closed
                    </span>
                  )}
                </div>

                {/* Coordinators */}
                {eventData.coordinators && eventData.coordinators.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700">Coordinators</h3>
                    <ul className="list-disc list-inside">
                      {eventData.coordinators.map((coordinator, index) => (
                        <li key={index}>
                          {coordinator.name} - {coordinator.phone}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Pending Verifications UI */}
            {eventData.paymentEnabled && eventData.paymentProofs && eventData.paymentProofs.length > 0 && (
              <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h2 className="text-xl font-bold text-yellow-800 mb-4 border-b border-yellow-200 pb-2">
                  Pending Verifications ({eventData.paymentProofs.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eventData.paymentProofs.map((proof, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-yellow-100 overflow-hidden flex flex-col">
                      <div className="p-3 bg-yellow-100/50 border-b border-yellow-100">
                        <p className="text-sm font-medium text-gray-800 truncate" title={proof.userEmail}>
                          {proof.userEmail}
                        </p>
                      </div>
                      <div className="p-4 flex-1 flex flex-col items-center justify-center bg-gray-50">
                        <a href={proof.proofURL} target="_blank" rel="noreferrer" className="block w-full">
                          <img 
                            src={proof.proofURL} 
                            alt="Payment Proof" 
                            className="max-h-40 object-contain mx-auto border border-gray-200 rounded shadow-sm hover:opacity-90 transition-opacity"
                          />
                        </a>
                        <p className="text-xs text-gray-400 mt-2 text-center italic">Click image to enlarge</p>
                      </div>
                      <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2 justify-between">
                        <button
                          onClick={() => handleRejectPayment(proof)}
                          className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprovePayment(proof)}
                          className="flex-1 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-md text-sm font-medium transition-colors shadow-sm"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              {/* Copy Shareable Event Link */}
              <button
                onClick={() => {
                  const link = `${window.location.origin}/event/${id}`;
                  navigator.clipboard.writeText(link);
                  alert(`Event link copied!\n${link}`);
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <LinkIcon className="h-5 w-5" />
                Copy Event Link
              </button>
              {eventData.status !== 'closed' && (
                <Link
                  to={`/OrganiserHomePage/EditEvent/${id}`}
                  className="flex items-center gap-2 bg-[#246d8c] hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PencilIcon className="h-5 w-5" />
                  Edit Event
                </Link>
              )}

              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <TrashIcon className="h-5 w-5" />
                Delete Event
              </button>

              {eventData.status !== 'closed' && (
                <button
                  onClick={handleCloseEvent}
                  className="flex items-center gap-2 bg-[#246d8c] hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <LockClosedIcon className="h-5 w-5" />
                  Close Event
                </button>
              )}

              {eventData.status === 'closed' && (
                <button
                  onClick={() => setShowReportForm(true)}
                  className="flex items-center gap-2 bg-[#246d8c] hover:bg-[#246d8c] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  Generate Report
                </button>
              )}

              {eventData.status === 'closed' && (
                <Link
                  to={`/OrganiserFeedbackDetails/${id}`}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  View Feedback
                </Link>
              )}

              <button
                onClick={() => navigate(`/OrganiserHomePage/OrganiserEventDetail/Scan/${id}`)}
                className="flex items-center gap-2 bg-[#246d8c] hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <QrCodeIcon className="h-5 w-5" />
                Scan Tickets
              </button>

              {/* Registered Participants Button */}
              <button
                onClick={() => navigate(`/OrganiserExtraDetails/${id}`)}
                className="flex items-center gap-2 bg-[#246d8c] hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Registered Participants
              </button>
              
              {/* View Attendance List Button */}
              <button
                onClick={() => navigate(`/OrganiserAttendanceDetails/${id}`)}
                className="flex items-center gap-2 bg-[#246d8c] hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Attendance List
              </button>
            </div>

            {/* Report Generation Form */}
            {showReportForm && (
              <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-bold mb-6 text-gray-800">Create Event Report</h2>
                <p className="text-sm text-gray-500 mb-6">Fill in all the details below. This will be used to generate the official event report PDF.</p>

                <div className="space-y-5">
                  {/* Geotagged Photo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Photo (Geotagged)</label>
                    {reportPhotoPreview ? (
                      <div className="relative mb-2">
                        <img src={reportPhotoPreview} alt="Event photo" className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded" />
                        <button onClick={() => { setReportPhoto(null); setReportPhotoPreview(''); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center" aria-label="Remove photo">×</button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                          <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> geotagged photo</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleReportPhotoChange} />
                      </label>
                    )}
                  </div>

                  {/* Date with Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                    <input type="text" value={reportDateWithTime} onChange={(e) => setReportDateWithTime(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#246d8c] focus:border-[#246d8c]" placeholder="e.g. 6th February, 2026 (11:40 am – 12:40 pm)" required />
                  </div>

                  {/* Venue */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                    <input type="text" value={reportVenue} onChange={(e) => setReportVenue(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#246d8c] focus:border-[#246d8c]" placeholder="e.g. Gallery Hall" required />
                  </div>

                  {/* Total Participants */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Participants</label>
                    <textarea value={reportParticipants} onChange={(e) => setReportParticipants(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#246d8c] focus:border-[#246d8c]" rows={2} placeholder="e.g. HOD (Dep of CS) - Dr. Preetha KG, All Students from 3rd and 4th year and faculties of CS department" required />
                  </div>

                  {/* Faculty Incharges */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Incharges</label>
                    <input type="text" value={reportFacultyIncharges} onChange={(e) => setReportFacultyIncharges(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#246d8c] focus:border-[#246d8c]" placeholder="e.g. Ms. Jisha Mary Jose, Dr. Preetha K.G" required />
                  </div>

                  {/* Speaker Toggle */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800">Resource Person / Speaker</div>
                        <div className="text-sm text-gray-500">Toggle on if the event had a speaker</div>
                      </div>
                      <button type="button" onClick={() => { setHasSpeaker(!hasSpeaker); if (!hasSpeaker && speakers.length === 0) addSpeaker(); }} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none ${hasSpeaker ? 'bg-[#246d8c]' : 'bg-gray-300'}`}>
                        <span className={`${hasSpeaker ? 'translate-x-6' : 'translate-x-1'} inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow-sm`} />
                      </button>
                    </div>

                    {hasSpeaker && (
                      <div className="mt-4 space-y-3">
                        {speakers.map((speaker, index) => (
                          <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-md border border-gray-100">
                            <div className="flex-1">
                              <input type="text" value={speaker.name} onChange={(e) => updateSpeaker(index, 'name', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#246d8c]" placeholder="Speaker Name" />
                            </div>
                            <div className="flex-1">
                              <input type="text" value={speaker.designation} onChange={(e) => updateSpeaker(index, 'designation', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#246d8c]" placeholder="Designation (e.g. Career Expert, Senior BDM)" />
                            </div>
                            {speakers.length > 1 && (
                              <button onClick={() => removeSpeaker(index)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2 self-center">Remove</button>
                            )}
                          </div>
                        ))}
                        <button onClick={addSpeaker} className="text-[#246d8c] hover:text-[#1a4f63] text-sm font-medium">+ Add another speaker</button>
                      </div>
                    )}
                  </div>

                  {/* Event Overview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Overview</label>
                    <p className="text-xs text-gray-400 mb-1">Write a detailed overview of the event. Use multiple paragraphs as needed.</p>
                    <textarea value={reportOverview} onChange={(e) => setReportOverview(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#246d8c] focus:border-[#246d8c]" rows={8} placeholder="The Department of Computer Science organized a career guidance session titled..." required />
                  </div>

                  {/* Conclusion */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conclusion</label>
                    <textarea value={reportConclusion} onChange={(e) => setReportConclusion(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#246d8c] focus:border-[#246d8c]" rows={4} placeholder="The event offered students a clear understanding of..." required />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setShowReportForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors">Cancel</button>
                    <button onClick={handleGenerateReport} className="px-6 py-2 rounded-md text-white bg-[#246d8c] hover:bg-[#1a4f63] transition-colors flex items-center gap-2">
                      <DocumentTextIcon className="h-5 w-5" />
                      Preview & Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Report Preview & Download */}
            {reportReady && (
              <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Event Report Preview</h2>
                  <div className="flex gap-3">
                    <button onClick={copyToClipboard} className="flex items-center gap-1 text-[#246d8c] hover:text-[#1a4f63] text-sm font-medium">
                      <ClipboardDocumentIcon className="h-5 w-5" /> Copy Text
                    </button>
                    <button onClick={downloadPDF} className="flex items-center gap-1 bg-[#246d8c] text-white px-4 py-2 rounded-lg hover:bg-[#1a4f63] text-sm font-medium">
                      <ArrowDownTrayIcon className="h-5 w-5" /> Download PDF
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-md border border-gray-100 space-y-4">
                  <h3 className="text-lg font-bold text-center">Event Report: {eventData.name}</h3>

                  {reportPhotoPreview && (
                    <div className="flex justify-center"><img src={reportPhotoPreview} alt="Event" className="max-h-52 rounded-md border border-gray-200" /></div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex"><span className="font-semibold w-44 shrink-0">DATE:</span><span>{reportDateWithTime}</span></div>
                    <div className="flex"><span className="font-semibold w-44 shrink-0">VENUE:</span><span>{reportVenue}</span></div>
                    <div className="flex"><span className="font-semibold w-44 shrink-0">TOTAL PARTICIPANTS:</span><span>{reportParticipants}</span></div>
                    <div className="flex"><span className="font-semibold w-44 shrink-0">FACULTY INCHARGES:</span><span>{reportFacultyIncharges}</span></div>
                    {hasSpeaker && speakers.map((s, i) => (
                      <div key={i} className="flex flex-col">
                        <div className="flex"><span className="font-semibold w-44 shrink-0">{speakers.length === 1 ? 'RESOURCE PERSON:' : `RESOURCE PERSON ${i+1}:`}</span><span>{s.name}</span></div>
                        <div className="flex"><span className="w-44 shrink-0"></span><span className="italic text-gray-500">({s.designation})</span></div>
                      </div>
                    ))}
                  </div>

                  <hr className="border-gray-200" />

                  <div>
                    <h4 className="font-bold text-sm mb-2">EVENT OVERVIEW:</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{reportOverview}</div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm mb-2">CONCLUSION:</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{reportConclusion}</div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button onClick={() => { setReportReady(false); setShowReportForm(true); }} className="text-sm text-[#246d8c] hover:underline">← Edit Report</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">No event found for this ID.</p>
        </div>
      )}
    </div>
  );
};

export default OrganiserEventDetail;