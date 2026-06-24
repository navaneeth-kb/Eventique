import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const Ticket: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userBranch, setUserBranch] = useState<string | null>(null);
  const [userYear, setUserYear] = useState<number | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);
        setUserName(user.displayName);

        // Fetch additional profile info from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserName(data.name || user.displayName);
            setUserBranch(data.branch || null);
            setUserYear(data.year || null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#e9f7f1] flex flex-col items-center justify-center p-4">
      {/* Page Title */}
      <h2 className="text-2xl font-bold text-[#246d8c] mb-6 tracking-wide">
        My Pass
      </h2>

      {/* Pass Card */}
      <div className="w-full max-w-sm relative">
        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Teal header strip */}
          <div className="bg-[#246d8c] px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs uppercase tracking-widest font-medium">
                  Event Pass
                </p>
                <h3 className="text-xl font-bold mt-1">
                  {userName || 'Student'}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {userName ? userName.charAt(0).toUpperCase() : 'S'}
              </div>
            </div>
          </div>

          {/* Decorative cutout divider */}
          <div className="relative">
            <div className="absolute -left-3 -top-3 w-6 h-6 bg-[#e9f7f1] rounded-full"></div>
            <div className="absolute -right-3 -top-3 w-6 h-6 bg-[#e9f7f1] rounded-full"></div>
            <div className="border-t-2 border-dashed border-gray-200 mx-6"></div>
          </div>

          {/* User details */}
          <div className="px-6 py-4 space-y-2">
            {userEmail && (
              <div className="flex items-center text-sm">
                <span className="text-gray-400 w-16">Email</span>
                <span className="text-gray-700 font-medium truncate">{userEmail}</span>
              </div>
            )}
            {userBranch && (
              <div className="flex items-center text-sm">
                <span className="text-gray-400 w-16">Branch</span>
                <span className="text-gray-700 font-medium">{userBranch}</span>
              </div>
            )}
            {userYear && (
              <div className="flex items-center text-sm">
                <span className="text-gray-400 w-16">Year</span>
                <span className="text-gray-700 font-medium">Year {userYear}</span>
              </div>
            )}
          </div>

          {/* QR Code Section */}
          <div className="px-6 pb-6 pt-2 flex flex-col items-center">
            <div className="bg-[#f6fcf7] p-5 rounded-xl border border-gray-100">
              <QRCode 
                size={160}
                value={userEmail ? `User: ${userEmail}` : 'No user logged in'} 
                bgColor="#f6fcf7"
                fgColor="#246d8c"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              Show this QR code at the event entrance
            </p>
          </div>

          {/* Bottom accent bar */}
          <div className="h-2 bg-gradient-to-r from-[#246d8c] via-[#2B8D9C] to-[#246d8c]"></div>
        </div>
      </div>
    </div>
  );
};

export default Ticket;
