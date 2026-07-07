import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  MapPinIcon, 
  ClockIcon, 
  UsersIcon, 
  CurrencyRupeeIcon 
, ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// @ts-ignore
import { storage } from "../../firebaseConfig";

interface UserProfile {
  name: string;
  email: string;
  uid: string;
  batch: string;
  branch: string;
  division: string;
  year: number;
  gender?: string;
}

type CertificateStyle = "classic" | "modern" | "elegant" | "minimal";

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [certificateStyle, setCertificateStyle] = useState<CertificateStyle>("elegant");
  const [certificateName, setCertificateName] = useState<string>("");
  const [eventData, setEventData] = useState<any>(null);
  const [organizerData, setOrganizerData] = useState<any>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [joinTeamMode, setJoinTeamMode] = useState(false);
  const [createTeamMode, setCreateTeamMode] = useState(false);
  const [teamCodeInput, setTeamCodeInput] = useState("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]); // To store detailed user profiles for team members

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isPendingVerification, setIsPendingVerification] = useState<boolean>(false);
  const [isPresent, setIsPresent] = useState<boolean>(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<string | null>(null);
  const [isUploadingPayment, setIsUploadingPayment] = useState(false);
  const [isEventClosed, setIsEventClosed] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "",
    email: "",
    uid: "",
    batch: "",
    branch: "",
    division: "",
    year: 0
  });
  const [teamNameInput, setTeamNameInput] = useState<string>("");
  const [dietaryPreference, setDietaryPreference] = useState<"Veg" | "Non-Veg" | "">("");

  // Feedback States
  const [q1Rec, setQ1Rec] = useState<number | null>(null);
  const [q2Rate, setQ2Rate] = useState<string>("");
  const [q3Info, setQ3Info] = useState<string>("");
  const [q4Dur, setQ4Dur] = useState<string>("");
  const [q5Sat, setQ5Sat] = useState<string>("");
  const [q6Learn, setQ6Learn] = useState<string>("");
  const [q7Comment, setQ7Comment] = useState<string>("");
  
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [userFeedback, setUserFeedback] = useState<any>(null);

  // Signature image placeholder  
  const signatureImage = "/images/signature.png";

  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
        fetchUserProfile(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userProfile.name) {
      setCertificateName(userProfile.name);
    }
  }, [userProfile.name]);

  const fetchUserProfile = async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile({
          name: userData.name || "",
          email: userEmail || "",
          uid: uid,
          batch: userData.batch || "",
          branch: userData.branch || "",
          division: userData.division || "",
          year: userData.year || 0,
          gender: userData.gender || ""
        });
      }
    } catch (error) {
      console.error("Error fetching user profile: ", error);
    }
  };

  const fetchOrganizerData = async (organizerEmail: string) => {
    try {
      const organizerDocRef = doc(db, "organizers", organizerEmail);
      const organizerDoc = await getDoc(organizerDocRef);

      if (organizerDoc.exists()) {
        setOrganizerData(organizerDoc.data());
      }
    } catch (error) {
      console.error("Error fetching organizer data: ", error);
    }
  };

  useEffect(() => {
    let unsubscribeTeam: (() => void) | null = null;

    if (id) {
      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setEventData(data);
            setIsEventClosed(data.status === 'closed');

            if (data.organiser) {
              fetchOrganizerData(data.organiser);
            }
            
            if (data.isTeamEvent) {
              setIsTeamEvent(true);
            }

            if (userEmail) {
              if (data.isTeamEvent) {
                // Check if user is in any team and listen in real-time
                const teamsRef = collection(db, 'event', id, 'teams');
                const q = query(teamsRef, where("members", "array-contains", userEmail));
                
                unsubscribeTeam = onSnapshot(q, async (teamSnaps) => {
                  if (!teamSnaps.empty) {
                    const teamData = teamSnaps.docs[0].data();
                    setUserTeam(teamData);
                    
                    if (teamData.status === 'registered') {
                      setIsRegistered(true);
                    } else if (teamData.status === 'pending_verification') {
                      setIsPendingVerification(true);
                    }
                    
                    // Fetch team members profiles
                    const memberPromises = teamData.members.map(async (mEmail: string) => {
                      try {
                        const uq = query(collection(db, 'users'), where("email", "==", mEmail));
                        const uSnap = await getDocs(uq);
                        return uSnap.empty ? { name: mEmail, email: mEmail } : uSnap.docs[0].data();
                      } catch (error) {
                        console.warn("Could not fetch profile for", mEmail, "- falling back to email.");
                        return { name: mEmail, email: mEmail };
                      }
                    });
                    setTeamMembers(await Promise.all(memberPromises));
                  }
                });
                
              }
              if (data.Participants?.includes(userEmail)) {
                setIsRegistered(true);
              } else if (data.paymentProofs?.some((proof: any) => proof.userEmail === userEmail)) {
                setIsPendingVerification(true);
              }
            }
            
            // Only check attendance if event is closed
            if (userEmail && data.attendees && data.status === 'closed') {
              const userAttendance = data.attendees.find((attendee: any) => 
                attendee.email === userEmail || attendee.email === `"${userEmail}"`
              );
              
              if (userAttendance) {
                setIsPresent(true);
              }
            }
          } else {
            setError('Event not found.');
          }
        } catch (error) {
          console.error('Error fetching event details:', error);
          setError('Failed to load event details: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
          setLoading(false);
        }
      };

      fetchEventDetails();
    } else {
      setError('Event ID is missing.');
      setLoading(false);
    }

    return () => {
      if (unsubscribeTeam) {
        unsubscribeTeam();
      }
    };
  }, [id, userEmail]);

  const submitFeedback = async () => {
    if (!userEmail || !id || q1Rec === null || !q2Rate || !q3Info || !q4Dur || !q5Sat || !q6Learn || isSubmittingFeedback) return;
  
    setIsSubmittingFeedback(true);
    try {
      const feedbackData = {
        email: userEmail,
        timestamp: new Date(),
        userName: userProfile.name,
        gender: userProfile.gender || "",
        q1Rec,
        q2Rate,
        q3Info,
        q4Dur,
        q5Sat,
        q6Learn,
        q7Comment
      };
  
      const eventRef = doc(db, 'event', id);
      await updateDoc(eventRef, {
        feedback: arrayUnion(feedbackData)
      });
  
      setFeedbackSubmitted(true);
      setUserFeedback(feedbackData);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setRegisterMessage('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handlePaymentScreenshotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setPaymentScreenshot(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentScreenshotPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const uploadPaymentProof = async () => {
    if (!paymentScreenshot || !userEmail || !id || isEventClosed) return;

    setIsUploadingPayment(true);
    try {
      const fileName = `payment_proofs/${id}_${userEmail}_${Date.now()}.${paymentScreenshot.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, paymentScreenshot);
      const downloadURL = await getDownloadURL(storageRef);
      
      const eventRef = doc(db, 'event', id);
      const proofData: any = {
        userEmail,
        proofURL: downloadURL,
        storagePath: fileName,
        timestamp: new Date()
      };
      if (isTeamEvent && userTeam) {
        proofData.teamCode = userTeam.teamCode;
        
        // Also update team status
        const teamRef = doc(db, 'event', id, 'teams', userTeam.teamCode);
        await updateDoc(teamRef, {
          status: 'pending_verification',
          paymentProofURL: downloadURL,
          paymentStoragePath: fileName
        });
      }
      

      const updatePayload: any = {
        paymentProofs: arrayUnion(proofData)
      };
      if (!isTeamEvent && eventData?.isFoodProvided && dietaryPreference) {
        updatePayload[`dietaryPreferences.${userEmail.replace(/\./g, ',')}`] = dietaryPreference;
      }
      await updateDoc(eventRef, updatePayload);
      
      setRegisterMessage('Payment proof uploaded successfully! Your registration is pending verification.');
      setIsPendingVerification(true);
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      setRegisterMessage('Failed to upload payment proof. Please try again.');
    } finally {
      setIsUploadingPayment(false);
    }
  };


  const handleRegisterAsLeader = async () => {
    if (!userEmail || !id) return;
    try {
      const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const teamRef = doc(db, 'event', id, 'teams', teamCode);
      const newTeam = {
        teamCode,
        teamName: teamNameInput || `Team ${teamCode}`,
        leaderEmail: userEmail,
        members: [userEmail],
        status: 'forming',
        createdAt: new Date()
      };
      await setDoc(teamRef, newTeam);

      if (eventData?.isFoodProvided && dietaryPreference) {
        const eventRef = doc(db, 'event', id);
        await updateDoc(eventRef, {
          [`dietaryPreferences.${userEmail.replace(/\./g, ',')}`]: dietaryPreference
        });
      }

      setUserTeam(newTeam);
      setTeamMembers([userProfile]);
    } catch (error: any) {
      console.error("Error creating team:", error);
      setRegisterMessage(`Error creating team: ${error.message}`);
    }
  };

  const handleJoinTeamSubmit = async () => {
    if (!userEmail || !id || !teamCodeInput) return;
    try {
      const teamRef = doc(db, 'event', id, 'teams', teamCodeInput);
      const teamSnap = await getDoc(teamRef);
      if (!teamSnap.exists()) {
        setRegisterMessage("Invalid Team Code.");
        return;
      }
      const teamData = teamSnap.data();
      if (teamData.members.length >= (eventData?.maxTeamSize || 100)) {
        setRegisterMessage("Team is already full.");
        return;
      }
      if (teamData.status !== 'forming') {
        setRegisterMessage("This team has already finalized registration.");
        return;
      }
      
      await updateDoc(teamRef, {
        members: arrayUnion(userEmail)
      });
      
      if (eventData?.isFoodProvided && dietaryPreference) {
        const eventRef = doc(db, 'event', id);
        await updateDoc(eventRef, {
          [`dietaryPreferences.${userEmail.replace(/\./g, ',')}`]: dietaryPreference
        });
      }

      // Refresh page or update state locally
      const updatedTeam = { ...teamData, members: [...teamData.members, userEmail] };
      setUserTeam(updatedTeam);
      setTeamMembers([...teamMembers, userProfile]);
      setJoinTeamMode(false);
    } catch (error: any) {
      console.error("Error joining team:", error);
      setRegisterMessage(`Error joining team: ${error.message}`);
    }
  };

  const handleFinalizeTeamFree = async () => {
    if (!userEmail || !id || !userTeam) return;
    try {
      const eventRef = doc(db, 'event', id);
      await updateDoc(eventRef, {
        Participants: arrayUnion(...userTeam.members),
      });
      const teamRef = doc(db, 'event', id, 'teams', userTeam.teamCode);
      await updateDoc(teamRef, {
        status: 'registered'
      });
      setIsRegistered(true);
      setRegisterMessage('Team successfully registered!');
    } catch (error) {
      console.error(error);
      setRegisterMessage('Failed to register team.');
    }
  };

  const handleRegister = async () => {
    if (!userEmail || isEventClosed) {
      setRegisterMessage('Registration is closed for this event.');
      return;
    }

    try {
      const docRef = doc(db, 'event', id!);
      const updatePayload: any = {
        Participants: arrayUnion(userEmail),
      };
      if (eventData?.isFoodProvided && dietaryPreference) {
        updatePayload[`dietaryPreferences.${userEmail.replace(/\./g, ',')}`] = dietaryPreference;
      }
      await updateDoc(docRef, updatePayload);
      setRegisterMessage('Successfully registered!');
      setIsRegistered(true);
    } catch (error) {
      console.error('Error registering for event:', error);
      setRegisterMessage('Failed to register. Please try again later.');
    }
  };


  const generateCertificate = async () => {
    if (!isPresent || !isEventClosed) return;
    
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'absolute';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.width = '842px';
    hiddenContainer.style.height = '595px';
    
    const certificateElement = document.getElementById("certificate");
    if (!certificateElement) return;
    
    const certificateClone = certificateElement.cloneNode(true) as HTMLElement;
    certificateClone.className = `${getBackgroundStyle()} p-8 rounded-lg overflow-hidden font-serif`;
    certificateClone.style.width = '842px';
    certificateClone.style.height = '595px';
    
    hiddenContainer.appendChild(certificateClone);
    document.body.appendChild(hiddenContainer);
    
    try {
      const canvas = await html2canvas(certificateClone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      const displayName = certificateName.trim() ? certificateName : userProfile.name;
      pdf.save(`certificate_${displayName}_${eventData.name}.pdf`);
    } finally {
      document.body.removeChild(hiddenContainer);
    }
  };

  useEffect(() => {
    if (id) {
      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);
          const docSnap = await getDoc(docRef);
  
          if (docSnap.exists()) {
            const data = docSnap.data();
            setEventData(data);
            setIsEventClosed(data.status === 'closed');
  
            if (data.organiser) {
              fetchOrganizerData(data.organiser);
            }
            
            if (data.isTeamEvent) {
              setIsTeamEvent(true);
            }
  
            if (userEmail && data.Participants?.includes(userEmail)) {
              setIsRegistered(true);
            }
            
            // Check for existing feedback
            if (userEmail && data.feedback) {
              const userFeedback = data.feedback.find((f: any) => f.email === userEmail);
              if (userFeedback) {
                setFeedbackSubmitted(true);
                setUserFeedback(userFeedback);
                setQ1Rec(userFeedback.q1Rec ?? null);
                setQ2Rate(userFeedback.q2Rate || "");
                setQ3Info(userFeedback.q3Info || "");
                setQ4Dur(userFeedback.q4Dur || "");
                setQ5Sat(userFeedback.q5Sat || "");
                setQ6Learn(userFeedback.q6Learn || "");
                setQ7Comment(userFeedback.q7Comment || userFeedback.comment || "");
              }
            }
            
            // Only check attendance if event is closed
            if (userEmail && data.attendees && data.status === 'closed') {
              const userAttendance = data.attendees.find((attendee: any) => 
                attendee.email === userEmail || attendee.email === `"${userEmail}"`
              );
              
              if (userAttendance) {
                setIsPresent(true);
              }
            }
          } else {
            setError('Event not found.');
          }
        } catch (error) {
          console.error('Error fetching event details:', error);
          setError('Failed to load event details: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
          setLoading(false);
        }
      };
  
      fetchEventDetails();
    } else {
      setError('Event ID is missing.');
      setLoading(false);
    }
  }, [id, userEmail]);

  const handleUnregister = async () => {
    try {
      if (!userEmail || !id) {
        setRegisterMessage('Error: Missing user information');
        return;
      }
  
      let confirmMsg = 'Are you sure you want to unregister from this event?';
      if (eventData.paymentEnabled) {
        confirmMsg = 'Are you sure you want to unregister? For refunds, please contact the event coordinators directly. Proceed with unregistration?';
      }

      const confirmUnregister = window.confirm(confirmMsg);
      if (!confirmUnregister) return;
  
      const eventRef = doc(db, 'event', id);
      
      if (isTeamEvent && userTeam) {
        if (userTeam.leaderEmail !== userEmail) {
           setRegisterMessage("Only the team leader can unregister the team.");
           return;
        }
        
        await updateDoc(eventRef, {
          Participants: arrayRemove(...userTeam.members),
        });
        
        // Delete team doc or mark it cancelled
        await deleteDoc(doc(db, 'event', id, 'teams', userTeam.teamCode));
        setUserTeam(null);
      } else {
        await updateDoc(eventRef, {
          Participants: arrayRemove(userEmail),
          paymentProofs: arrayRemove({
            userEmail: userEmail
          })
        });
      }
  
      // Update local state
      setIsRegistered(false);
      setRegisterMessage('Successfully unregistered from the event');
      
      // If there was a payment screenshot, clear it
      if (paymentScreenshotPreview) {
        setPaymentScreenshot(null);
        setPaymentScreenshotPreview(null);
      }
  
    } catch (error) {
      console.error('Error unregistering from event:', error);
      setRegisterMessage('Failed to unregister. Please try again.');
    }
  };

  const getBackgroundStyle = () => {
    switch (certificateStyle) {
      case "classic": return "bg-gradient-to-r from-amber-50 to-yellow-50";
      case "modern": return "bg-gradient-to-r from-indigo-50 to-purple-50";
      case "elegant": return "bg-gradient-to-r from-blue-50 to-indigo-50";
      case "minimal": return "bg-white";
      default: return "bg-gradient-to-r from-blue-50 to-indigo-50";
    }
  };

  const getBorderStyle = () => {
    switch (certificateStyle) {
      case "classic": return "border-8 border-double border-amber-200";
      case "modern": return "border-4 border-solid border-indigo-300";
      case "elegant": return "border-8 border-double border-blue-200";
      case "minimal": return "border-2 border-solid border-gray-300";
      default: return "border-8 border-double border-blue-200";
    }
  };

  if (loading) {
    return <p className="text-center text-gray-600">Loading event details...</p>;
  }

  if (error) {
    return <p className="text-center text-red-600">{error}</p>;
  }

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]} ${parts[1]} ${parts[0]}`;
    }
    return dateStr;
  };

  const organizerName = organizerData?.name || (eventData?.organiser ? eventData.organiser.split('@')[0] : "Unknown Organizer");

  return (
    <div className="min-h-screen bg-[#e9f7f1] p-4 md:p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-4xl mb-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-[#246d8c] transition-colors font-medium bg-white px-4 py-2 rounded-full shadow-sm w-max"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>

      {eventData ? (
        <div className="w-full max-w-4xl space-y-6">
          {/* Main Event Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
            
            {/* Left: Poster */}
            <div className="w-full md:w-2/5 h-64 md:h-auto bg-gray-100 relative">
              <img 
                src={eventData.poster} 
                alt={eventData.name} 
                className="w-full h-full object-cover absolute inset-0"
              />
              {isEventClosed && (
                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
                  Closed
                </div>
              )}
            </div>

            {/* Right: Details */}
            <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col">
              <div className="mb-3 inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-max">
                {organizerName}
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {eventData.name}
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <CalendarIcon className="w-6 h-6 text-[#246d8c] mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Date</p>
                    <p className="text-gray-900 font-semibold">{formatEventDate(eventData.event_date)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPinIcon className="w-6 h-6 text-[#246d8c] mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Venue</p>
                    <p className="text-gray-900 font-semibold">{eventData.venue}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <ClockIcon className="w-6 h-6 text-[#246d8c] mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Time</p>
                    <p className="text-gray-900 font-semibold">{eventData.event_time}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <UsersIcon className="w-6 h-6 text-[#246d8c] mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Capacity</p>
                    <p className="text-gray-900 font-semibold">{eventData.num_of_participants} Participants</p>
                  </div>
                </div>

                {eventData.paymentEnabled && (
                  <div className="flex items-start">
                    <CurrencyRupeeIcon className="w-6 h-6 text-[#246d8c] mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Price</p>
                      <p className="text-gray-900 font-semibold text-lg text-green-700">₹{eventData.price}</p>
                    </div>
                  </div>
                )}
              </div>

              {eventData.description && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">About this event</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{eventData.description}</p>
                </div>
              )}

              <div className="mt-auto">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Event Coordinators</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {eventData.coordinator1 && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="font-medium text-gray-900 text-sm">{eventData.coordinator1.name}</p>
                      <p className="text-gray-500 text-sm">{eventData.coordinator1.phone}</p>
                    </div>
                  )}
                  {eventData.coordinator2 && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="font-medium text-gray-900 text-sm">{eventData.coordinator2.name}</p>
                      <p className="text-gray-500 text-sm">{eventData.coordinator2.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Registration & Feedback Sections wrapper */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            
            {eventData.isOvernight && !isEventClosed && (
              <div className="mb-6 p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-md flex items-start shadow-sm">
                <span className="text-xl mr-3" role="img" aria-label="moon">🌙</span>
                <div>
                  <h4 className="font-bold text-indigo-900">Overnight Event</h4>
                  <p className="text-indigo-800 text-sm mt-1">
                    This event spans across multiple days/nights. Please ensure you bring necessary clothes, toiletries, and other essential items.
                  </p>
                </div>
              </div>
            )}

            {/* Registration Status Section */}
            <div className="mb-6 border-t pt-4">
              {isRegistered && !isEventClosed && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-center">
                    <p className="text-green-600 font-medium">
                      You are registered for this event!
                    </p>
                  </div>
                  
                  {eventData.whatsappLinkEnabled && eventData.whatsappLink && (
                    <div className="mt-4 flex justify-center">
                      <a
                        href={eventData.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366] hover:bg-[#128C7E] text-white py-2 px-6 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                        Join WhatsApp Group
                      </a>
                    </div>
                  )}

                  {!isTeamEvent && !isEventClosed && (
                    <div className="mt-3 flex justify-center">
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium"
                        onClick={handleUnregister}
                      >
                        Unregister from Event
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {isPendingVerification && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-6">
                  <div className="text-center">
                    <p className="text-yellow-700 font-medium">
                      Payment Proof Submitted
                    </p>
                    <p className="text-sm text-yellow-600 mt-1">
                      Your payment is currently under review by the organiser. You will be officially registered once verified.
                    </p>
                  </div>
                </div>
              )}

              {isTeamEvent ? (
                (userTeam || (!isRegistered && !isPendingVerification && !isEventClosed && eventData.registrationOpen !== false)) && (
                  <div className="space-y-4">
                    {userTeam ? (
                      <div className="bg-white border rounded-lg p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-bold text-gray-800">Team: {userTeam.teamName || 'Your Team'}</h3>
                          <div className="flex gap-2 items-center">
                            <button 
                              onClick={async () => {
                                const teamSnap = await getDoc(doc(db, 'event', id!, 'teams', userTeam.teamCode));
                                if (teamSnap.exists()) {
                                  const td = teamSnap.data();
                                  setUserTeam(td);
                                  const memberPromises = td.members.map(async (mEmail: string) => {
                                    try {
                                      const uq = query(collection(db, 'users'), where("email", "==", mEmail));
                                      const uSnap = await getDocs(uq);
                                      return uSnap.empty ? { name: mEmail, email: mEmail } : uSnap.docs[0].data();
                                    } catch { return { name: mEmail, email: mEmail }; }
                                  });
                                  setTeamMembers(await Promise.all(memberPromises));
                                }
                              }}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-medium transition-colors"
                            >
                              ↻ Refresh Members
                            </button>
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                              Code: {userTeam.teamCode}
                              <button 
                                onClick={() => { navigator.clipboard.writeText(userTeam.teamCode); alert('Copied!'); }}
                                className="ml-2 hover:text-blue-600"
                              >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-500 uppercase">Members ({userTeam.members.length}/{eventData.maxTeamSize})</h4>
                          <ul className="mt-2 space-y-2">
                            {teamMembers.map((m, idx) => (
                              <li key={idx} className="flex items-center space-x-3 bg-gray-50 p-2 rounded">
                                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                                  {m.name ? m.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{m.name} {m.email === userTeam.leaderEmail ? '(Leader)' : ''}</p>
                                  <p className="text-xs text-gray-500">{m.email}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {userTeam.status === 'forming' && userTeam.leaderEmail === userEmail && (
                          <div className="mt-6 border-t pt-4">
                            {userTeam.members.length < eventData.minTeamSize ? (
                              <div className="text-amber-600 text-sm p-3 bg-amber-50 rounded">
                                You need at least {eventData.minTeamSize} members to finalize registration. Share the team code for others to join!
                              </div>
                            ) : (
                              <div>
                                {eventData.paymentEnabled ? (
                                  <>
                                    <h3 className="text-lg font-medium mb-3">Team Payment</h3>
                                    <p className="text-gray-700 mb-3">
                                      Total for {userTeam.members.length} members: ₹{eventData.price * userTeam.members.length}
                                    </p>
                                    <div className="mb-3">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload Payment Screenshot</label>
                                      {paymentScreenshotPreview ? (
                                        <div className="relative mb-2">
                                          <img src={paymentScreenshotPreview} alt="Preview" className="w-full max-h-48 object-contain border rounded" />
                                          <button onClick={() => { setPaymentScreenshot(null); setPaymentScreenshotPreview(null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">×</button>
                                        </div>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                                          </div>
                                          <input type="file" className="hidden" accept="image/*" onChange={handlePaymentScreenshotChange}/>
                                        </label>
                                      )}
                                    </div>
                                    <button onClick={uploadPaymentProof} disabled={!paymentScreenshot || isUploadingPayment} className="w-full bg-green-600 text-white py-3 rounded-md font-medium">
                                      {isUploadingPayment ? 'Processing...' : 'Submit Payment & Register Team'}
                                    </button>
                                  </>
                                ) : (
                                  <button onClick={handleFinalizeTeamFree} className="w-full bg-[#246d8c] text-white py-3 rounded-md font-medium">
                                    Finalize Team Registration
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {userTeam.status === 'forming' && userTeam.leaderEmail !== userEmail && (
                          <div className="mt-4 text-center text-sm text-gray-600">
                            Waiting for the team leader to finalize registration.
                          </div>
                        )}
                        {userTeam.leaderEmail === userEmail ? (
                          !isEventClosed && (
                            <div className="mt-4 text-center">
                              <button onClick={handleUnregister} className="text-red-500 hover:text-red-700 text-sm font-medium">Unregister Team</button>
                            </div>
                          )
                        ) : (
                          <div className="mt-4 text-center">
                            <p className="text-gray-500 text-sm italic">Unregister can only be done by the team leader.</p>
                          </div>
                        )}
                      </div>
                    ) : joinTeamMode ? (
                      <div className="bg-white border rounded-lg p-5 shadow-sm text-center">
                        <h3 className="text-lg font-bold mb-4">Join a Team</h3>
                        <input type="text" placeholder="Enter Team Code" value={teamCodeInput} onChange={e => setTeamCodeInput(e.target.value.toUpperCase())} className="w-full h-12 px-4 mb-4 border rounded focus:ring-2 outline-none uppercase text-center font-bold tracking-widest" />
                        
                        {eventData.isFoodProvided && (
                          <div className="mb-4 text-left">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Your Dietary Preference *</label>
                            <select value={dietaryPreference} onChange={e => setDietaryPreference(e.target.value as any)} className="w-full h-12 px-4 border rounded focus:ring-2 outline-none bg-white">
                              <option value="">Select preference</option>
                              <option value="Veg">Vegetarian</option>
                              <option value="Non-Veg">Non-Vegetarian</option>
                            </select>
                          </div>
                        )}

                        <button onClick={handleJoinTeamSubmit} disabled={!teamCodeInput || (eventData.isFoodProvided && !dietaryPreference)} className="w-full bg-[#246d8c] text-white py-3 rounded-md font-medium mb-2 disabled:opacity-50">Join Team</button>
                        <button onClick={() => setJoinTeamMode(false)} className="w-full bg-gray-100 text-gray-700 py-2 rounded-md font-medium">Cancel</button>
                      </div>
                    ) : createTeamMode ? (
                      <div className="bg-white border rounded-lg p-5 shadow-sm text-center">
                        <h3 className="text-lg font-bold mb-4">Create a Team</h3>
                        <input type="text" placeholder="Enter Team Name" value={teamNameInput} onChange={e => setTeamNameInput(e.target.value)} className="w-full h-12 px-4 mb-4 border rounded focus:ring-2 outline-none text-center font-medium" />
                        
                        {eventData.isFoodProvided && (
                          <div className="mb-4 text-left">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Your Dietary Preference *</label>
                            <select value={dietaryPreference} onChange={e => setDietaryPreference(e.target.value as any)} className="w-full h-12 px-4 border rounded focus:ring-2 outline-none bg-white">
                              <option value="">Select preference</option>
                              <option value="Veg">Vegetarian</option>
                              <option value="Non-Veg">Non-Vegetarian</option>
                            </select>
                          </div>
                        )}

                        <button onClick={handleRegisterAsLeader} disabled={!teamNameInput || (eventData.isFoodProvided && !dietaryPreference)} className="w-full bg-[#246d8c] text-white py-3 rounded-md font-medium mb-2 disabled:opacity-50">Confirm & Create Team</button>
                        <button onClick={() => setCreateTeamMode(false)} className="w-full bg-gray-100 text-gray-700 py-2 rounded-md font-medium">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={() => setCreateTeamMode(true)} className="flex-1 bg-[#246d8c] hover:bg-[#1a4f63] text-white py-4 rounded-xl font-bold shadow-md transition-all">Create a Team (Leader)</button>
                        <button onClick={() => setJoinTeamMode(true)} className="flex-1 bg-white border-2 border-[#246d8c] text-[#246d8c] hover:bg-blue-50 py-4 rounded-xl font-bold shadow-sm transition-all">Join a Team</button>
                      </div>
                    )}
                  </div>
                )
              ) : !isRegistered && !isPendingVerification ? (
                !isEventClosed && eventData.registrationOpen !== false ? (
                  eventData.paymentEnabled ? (
      <>
        <h3 className="text-lg font-medium mb-3">Payment Information</h3>
        <p className="text-gray-700 mb-3">
          This event requires payment of ₹{eventData.price}
        </p>
        
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Payment Screenshot
          </label>
          {paymentScreenshotPreview ? (
            <div className="relative mb-2">
              <img 
                src={paymentScreenshotPreview} 
                alt="Payment screenshot preview" 
                className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded"
              />
              <button
                onClick={() => {
                  setPaymentScreenshot(null);
                  setPaymentScreenshotPreview(null);
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                </svg>
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
              </div>
              <input 
                id="payment-screenshot" 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handlePaymentScreenshotChange}
              />
            </label>
          )}
        </div>
        
        {eventData.isFoodProvided && (
          <div className="mb-4 text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Dietary Preference *</label>
            <select value={dietaryPreference} onChange={e => setDietaryPreference(e.target.value as any)} className="w-full h-12 px-4 border rounded focus:ring-2 outline-none bg-white">
              <option value="">Select preference</option>
              <option value="Veg">Vegetarian</option>
              <option value="Non-Veg">Non-Vegetarian</option>
            </select>
          </div>
        )}

        <button
          onClick={uploadPaymentProof}
          disabled={!paymentScreenshot || isUploadingPayment || (eventData.isFoodProvided && !dietaryPreference)}
          className={`w-full py-3 rounded-md text-lg font-medium mb-4 ${
            !paymentScreenshot || isUploadingPayment || (eventData.isFoodProvided && !dietaryPreference)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isUploadingPayment ? 'Processing...' : 'Submit Payment & Register'}
        </button>
      </>
    ) : (
      <>
        {eventData.isFoodProvided && (
          <div className="mb-4 text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Dietary Preference *</label>
            <select value={dietaryPreference} onChange={e => setDietaryPreference(e.target.value as any)} className="w-full h-12 px-4 border rounded focus:ring-2 outline-none bg-white">
              <option value="">Select preference</option>
              <option value="Veg">Vegetarian</option>
              <option value="Non-Veg">Non-Vegetarian</option>
            </select>
          </div>
        )}
        <button
          className={`w-full py-3 rounded-md text-lg font-medium mb-4 text-white ${
            (eventData.isFoodProvided && !dietaryPreference) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#246d8c]'
          }`}
          disabled={eventData.isFoodProvided && !dietaryPreference}
          onClick={handleRegister}
        >
          Register
        </button>
      </>
    )
  ) : (
                  <div className="w-full bg-gray-400 text-white py-3 rounded-md text-lg font-medium mb-4 text-center cursor-not-allowed">
                    Registration Closed
                  </div>
                )
              ) : null}
              
              {(!isTeamEvent || !userTeam) && !isRegistered && !isPendingVerification && (isEventClosed || eventData.registrationOpen === false) && (
                <div className="w-full bg-gray-400 text-white py-3 rounded-md text-lg font-medium mb-4 text-center cursor-not-allowed">
                  Registration Closed
                </div>
              )}
            </div>

            {registerMessage && <p className="text-center text-green-600 mb-4">{registerMessage}</p>}

    
 

{isEventClosed && isPresent && (
  <div className="mt-4 p-6 bg-white border border-gray-200 shadow-sm rounded-lg w-full max-w-2xl mx-auto">
    <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center border-b pb-4">
      {feedbackSubmitted ? 'Thank you for your feedback!' : 'Event Feedback'}
    </h3>
    
    {feedbackSubmitted ? (
      <div className="space-y-4">
        <div className="bg-green-50 text-green-800 p-4 rounded-md text-center mb-6">
          Your feedback has been recorded successfully.
        </div>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Recommendation Score:</strong> {userFeedback.q1Rec || (userFeedback.rating ? userFeedback.rating * 2 : 'N/A')}/10</p>
          <p><strong>Event Rating:</strong> {userFeedback.q2Rate || 'N/A'}</p>
          <p><strong>Information Provided:</strong> {userFeedback.q3Info || 'N/A'}</p>
          <p><strong>Duration Fit:</strong> {userFeedback.q4Dur || 'N/A'}</p>
          <p><strong>Overall Satisfaction:</strong> {userFeedback.q5Sat || 'N/A'}</p>
          <p><strong>New Learnings:</strong> {userFeedback.q6Learn || 'N/A'}</p>
          {(userFeedback.q7Comment || userFeedback.comment) && (
            <div>
              <strong>Comments:</strong> 
              <p className="mt-1 bg-gray-50 p-3 rounded text-gray-600 italic">"{userFeedback.q7Comment || userFeedback.comment}"</p>
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="space-y-6 text-sm">
        {/* Q1 */}
        <div className="space-y-3">
          <label className="block font-medium text-gray-800">
            1. Considering your complete experience at the event, how likely are you to recommend our future events to your friends or colleagues?
          </label>
          <div className="flex flex-wrap gap-2 justify-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setQ1Rec(num)}
                className={`w-10 h-10 rounded-full font-medium transition-colors ${
                  q1Rec === num 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 px-2">
            <span>Not likely</span>
            <span>Extremely likely</span>
          </div>
        </div>

        {/* Q2 */}
        <div className="space-y-2">
          <label className="block font-medium text-gray-800">2. How would you rate the event?</label>
          <div className="space-y-1">
            {['Very good', 'Good', 'Acceptable', 'Poor', 'Very poor'].map((opt) => (
              <label key={opt} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input type="radio" name="q2Rate" value={opt} checked={q2Rate === opt} onChange={(e) => setQ2Rate(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q3 */}
        <div className="space-y-2">
          <label className="block font-medium text-gray-800">3. How much pre-event information was provided to you to help you better understand the event?</label>
          <div className="space-y-1">
            {['All of the information', 'Most of the information', 'Some of the information', 'A little of the information', 'None of the information'].map((opt) => (
              <label key={opt} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input type="radio" name="q3Info" value={opt} checked={q3Info === opt} onChange={(e) => setQ3Info(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q4 */}
        <div className="space-y-2">
          <label className="block font-medium text-gray-800">4. Please state your level of agreement with the statement: The duration of the event was just right.</label>
          <div className="space-y-1">
            {['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree'].map((opt) => (
              <label key={opt} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input type="radio" name="q4Dur" value={opt} checked={q4Dur === opt} onChange={(e) => setQ4Dur(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q5 */}
        <div className="space-y-2">
          <label className="block font-medium text-gray-800">5. Overall, how satisfied were you with the event?</label>
          <div className="space-y-1">
            {['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'].map((opt) => (
              <label key={opt} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input type="radio" name="q5Sat" value={opt} checked={q5Sat === opt} onChange={(e) => setQ5Sat(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q6 */}
        <div className="space-y-2">
          <label className="block font-medium text-gray-800">6. Did the event help you with new learnings or knowledge?</label>
          <div className="space-y-1">
            {['Yes', 'No'].map((opt) => (
              <label key={opt} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input type="radio" name="q6Learn" value={opt} checked={q6Learn === opt} onChange={(e) => setQ6Learn(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q7 */}
        <div className="space-y-2">
          <label className="block font-medium text-gray-800">7. Do you have any other comments/suggestions that would help us make future events better?</label>
          <textarea
            value={q7Comment}
            onChange={(e) => setQ7Comment(e.target.value)}
            placeholder="Share your thoughts (optional)"
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
          />
        </div>
        
        <button
          onClick={submitFeedback}
          disabled={q1Rec === null || !q2Rate || !q3Info || !q4Dur || !q5Sat || !q6Learn || isSubmittingFeedback}
          className={`w-full py-3 rounded-md text-base font-semibold shadow-sm transition-all ${
            q1Rec === null || !q2Rate || !q3Info || !q4Dur || !q5Sat || !q6Learn || isSubmittingFeedback
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
          }`}
        >
          {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    )}
  </div>
)}

            {/* Certificate Section - Only show if event is closed and feedback is submitted */}
            {isEventClosed && feedbackSubmitted && (
              <div className="mt-4 border-t pt-4 w-full">
                <h3 className="text-xl font-medium mb-4">Certificate</h3>
                
                {isPresent ? (
                  eventData.autoCertificateGen !== false ? (
                    <>
                    <div className="mb-4">
                      <label htmlFor="certificate-name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name for Certificate
                      </label>
                      <input
                        id="certificate-name"
                        type="text"
                        value={certificateName}
                        onChange={(e) => setCertificateName(e.target.value)}
                        placeholder="Enter full name as it should appear on certificate"
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave blank to use your profile name: {userProfile.name}
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="certificate-style" className="block text-sm font-medium text-gray-700 mb-2">
                        Certificate Style
                      </label>
                      <select
                        id="certificate-style"
                        value={certificateStyle}
                        onChange={(e) => setCertificateStyle(e.target.value as CertificateStyle)}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      >
                        <option value="elegant">Elegant</option>
                        <option value="modern">Modern</option>
                        <option value="classic">Classic</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </div>
                    
                    <button 
                      onClick={generateCertificate} 
                      className="w-full py-3 px-4 rounded-lg transition-all font-medium shadow-md bg-green-600 text-white hover:bg-green-700"
                    >
                      Download Certificate
                    </button>
                  </>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <p className="text-gray-700 font-medium">
                        The organiser will provide the certificate separately.
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Please contact the event coordinator for more information.
                      </p>
                    </div>
                  )
                ) : isRegistered ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-center">
                    <p className="text-amber-600 font-medium">
                      Your attendance was not marked for this event.
                    </p>
                    <p className="text-gray-600 mt-2 text-sm">
                      Please contact the event organizers to verify your participation.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
                    <p className="text-blue-600 font-medium">
                      Certificates are only available for attended participants.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Certificate Preview - Only show if event is closed, user is present, and feedback is submitted */}
          {isEventClosed && isPresent && feedbackSubmitted && eventData.autoCertificateGen !== false && (
            <div className="w-full max-w-5xl mx-auto mt-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Certificate Preview</h3>
              
              <div 
                id="certificate" 
                className={`w-full aspect-[842/595] mx-auto relative ${getBackgroundStyle()} p-4 md:p-8 shadow-2xl rounded-lg overflow-hidden font-serif`}
              >
                <div className={`absolute inset-2 ${getBorderStyle()} rounded-lg`}></div>
                
                <div className="flex flex-col items-center justify-center h-full w-full text-center px-2 sm:px-4 md:px-16 relative">
                  <div className="mt-2 md:mt-4 mb-2 md:mb-4 flex justify-center gap-4 md:gap-8">
                    {eventData && eventData.logos && eventData.logos.length > 0 ? (
                      <>
                        {eventData.logos.map((logo: string, index: number) => (
                          <img 
                            key={index} 
                            src={logo} 
                            alt={`Organization logo ${index + 1}`} 
                            className="h-8 md:h-16 w-auto object-contain" 
                          />
                        ))}
                      </>
                    ) : (
                      <div className="h-8 md:h-16 w-8 md:w-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs md:text-base">
                        LOGO
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-1 md:mb-2 text-gray-500 uppercase tracking-wider text-xs md:text-sm font-semibold">Official Certificate</div>
                  <h1 className="text-2xl md:text-4xl font-bold text-indigo-800 mb-2 md:mb-4 font-serif tracking-wide">Certificate of Participation</h1>
                  
                  <div className="w-20 md:w-40 h-0.5 md:h-1 bg-gradient-to-r from-indigo-300 to-blue-300 rounded-full mb-3 md:mb-6"></div>
                  
                  <p className="text-sm md:text-lg text-gray-600 mb-1 md:mb-2">This is to certify that</p>
                  <h2 className="text-xl md:text-3xl text-indigo-600 font-bold my-1 md:my-2 font-serif">
                    {certificateName.trim() ? certificateName : userProfile.name}
                  </h2>
                  
                  <p className="text-xs md:text-lg text-gray-600 max-w-lg my-2 md:my-4">
                    of {userProfile.batch} batch, {userProfile.branch} branch, has successfully
                    participated in {eventData.name} organized by {organizerName}.
                  </p>
                  
                  <div className="w-16 md:w-32 h-0.5 bg-gray-200 my-2 md:my-4"></div>
                  
                  <p className="text-xs md:text-base text-gray-600 mb-2 md:mb-4">Issued on: {currentDate}</p>
                  
                  <div className="mt-2 md:mt-4 flex flex-col items-center">
                    <img src={signatureImage} alt="Signature" className="w-20 md:w-40 mb-1 md:mb-2" />
                    <p className="text-xs md:text-sm text-gray-600 font-semibold">Authorized Signature</p>
                  </div>
                  
                  <p className="text-xxs md:text-xs text-gray-400 mt-2 absolute bottom-2 md:bottom-4 left-0 right-0">
                    Certificate ID: {Math.random().toString(36).substring(2, 12).toUpperCase()}
                  </p>
                  
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                    <div className="w-48 h-48 md:w-96 md:h-96 border-4 md:border-8 border-indigo-800 rounded-full flex items-center justify-center">
                      <div className="w-40 h-40 md:w-80 md:h-80 border-2 md:border-4 border-indigo-700 rounded-full flex items-center justify-center">
                        <div className="text-4xl md:text-8xl font-bold text-indigo-900">
                          {eventData.name ? eventData.name.substring(0, 3).toUpperCase() : "CERT"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-gray-500 text-sm mt-4 mb-8">
                <p>Certificate will display correctly on all devices when downloaded.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-600 mt-12">No event details available</p>
      )}
    </div>
  );
};

export default EventDetails;