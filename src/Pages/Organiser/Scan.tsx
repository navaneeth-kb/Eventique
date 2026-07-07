import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
// @ts-ignore
import { db } from "../../firebaseConfig"; // Adjust the path as needed
import BarcodeScannerComponent from "react-qr-barcode-scanner"; // QR scanner
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [organizerEmail, setOrganizerEmail] = useState<string | null>(null);
  const [scannedUser, setScannedUser] = useState<{ name: string; email: string; uid: string } | null>(null);

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Organizer is logged in:", user.email);
        setOrganizerEmail(user.email);
      } else {
        console.error("Organizer is NOT authenticated.");
        setOrganizerEmail(null);
      }
    });
  }, []);

  useEffect(() => {
    if (data !== "" && organizerEmail) {
      console.log("Scanned Data:", data);
      checkInDatabase(data);
    }
  }, [data, organizerEmail]);

  const checkInDatabase = async (scannedData: string) => {
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", scannedData));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        setStatus("❌ User not found in database.");
        return;
      }

      let userInfo: { name: string; email: string; uid: string } | null = null;

      userSnapshot.forEach((userDoc) => {
        userInfo = {
          name: userDoc.data().name || "Unknown",
          email: userDoc.data().email,
          uid: userDoc.id, // Firestore UID
        };
      });

      if (!userInfo) {
        setStatus("❌ User data retrieval failed.");
        return;
      }

      const eventRef = collection(db, "event");
      const eventQuery = query(eventRef, where("Participants", "array-contains", scannedData));
      const eventSnapshot = await getDocs(eventQuery);

      if (eventSnapshot.empty) {
        setStatus("⚠️ No matching event found for this user.");
        return;
      }

      eventSnapshot.forEach(async (docSnap) => {
        const eventId = docSnap.id;
        const eventDocRef = doc(db, "event", eventId);
        const eventData = docSnap.data();

        // Check if the user is already in attendees
        const attendees = eventData.attendees || [];
        if (attendees.some((att: { email: string }) => att.email === scannedData)) {
          // @ts-ignore
          setStatus(`⚠️ ${userInfo.name} (${scannedData}) is already marked as attended.`);
          return;
        }

        // Add ONLY email & timestamp to 'attendees' field
        const currentTime = Timestamp.now();
        await updateDoc(eventDocRef, {
          attendees: arrayUnion({
            email: scannedData,
            timestamp: currentTime,
          }),
        });

        setScannedUser(userInfo);
        // @ts-ignore
        setStatus(`✅ ${userInfo.name} (${scannedData}) marked as attended! 🎉`);

        console.log(`User ${scannedData} marked attended at ${currentTime.toDate()} in event ${eventId}`);

        // Reset scanned details after 3 seconds
        setTimeout(() => {
          setScannedUser(null);
          setStatus("");
          setData(""); // Reset scanned data
        }, 3000);
      });

    } catch (error) {
      console.error("Error checking the database:", error);
      setStatus("🚨 Error occurred while checking the database.");
    }
  };

  return (
    <div className="min-h-screen bg-[#e9f7f1] p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl mb-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-[#246d8c] transition-colors font-medium"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>

      <div className="w-full max-w-xl bg-white p-8 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-6 text-[#246d8c]">Scan QR Code</h2>
        
        <div className="bg-gray-50 p-2 rounded-xl shadow-inner border border-gray-200 mb-6 w-full flex justify-center overflow-hidden">
          <BarcodeScannerComponent
            width={300}
            height={300}
            // @ts-ignore
            onUpdate={(err, result) => {
              if (result) {
                // @ts-ignore
                setData(result.text ? result.text.replace(/^User:/i, "").trim() : "Not Found");
              }
            }}
          />
        </div>

        {scannedUser && (
          <div className="w-full mt-2 p-5 bg-green-50 border border-green-200 text-green-800 rounded-lg shadow-sm animate-fadeIn">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span className="text-2xl">✅</span> Scanned User
            </h3>
            <div className="space-y-1">
              <p className="text-md"><b className="font-semibold text-green-900">Name:</b> {scannedUser.name}</p>
              <p className="text-md"><b className="font-semibold text-green-900">Email:</b> {scannedUser.email}</p>
              <p className="text-md"><b className="font-semibold text-green-900">UID:</b> {scannedUser.uid}</p>
            </div>
          </div>
        )}

        {status && !scannedUser && (
          <div className={`w-full mt-4 p-4 rounded-lg text-center font-medium ${status.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scan;
