import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faSignOutAlt, faEnvelope } from "@fortawesome/free-solid-svg-icons";

// Initialize Firestore
const firestore = getFirestore();

const OrganiserProfile: React.FC = () => {
  const [organiserProfile, setOrganiserProfile] = useState({
    name: "",
    password: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
  
        if (user) {
          const email = user.email; // Fetch organizer's email
          if (email) {
            const organiserDocRef = doc(firestore, "organizers", email); // Use email as document ID
            const organiserDoc = await getDoc(organiserDocRef);
    
            if (organiserDoc.exists()) {
              const organiserData = organiserDoc.data();
              setOrganiserProfile({
                name: organiserData.name || "",
                password: organiserData.password || "",
                email: email,
              });
            } else {
              console.log("No such organiser profile found!");
              setOrganiserProfile(prev => ({ ...prev, email: email }));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching organiser profile data: ", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchProfileData();
  }, []);
  

  const handleLogout = async () => {
    const auth = getAuth();
    if (window.confirm("Are you sure you want to log out?")) {
      try {
        await signOut(auth);
        navigate("/");
      } catch (error) {
        console.error("Error during logout: ", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#246d8c]">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e9f7f1] flex flex-col items-center justify-start p-4 pb-20">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden mt-4">
        {/* Profile Header */}
        <div className="bg-[#246d8c] p-6 text-white text-center relative">
          <div className="w-24 h-24 rounded-full bg-white text-[#246d8c] flex items-center justify-center text-4xl font-bold mx-auto mb-4 shadow-md">
            {organiserProfile.name ? organiserProfile.name.charAt(0).toUpperCase() : 'O'}
          </div>
          <h1 className="text-2xl font-bold">{organiserProfile.name || "Organiser"}</h1>
          <p className="text-blue-100 mt-1">Organiser Account</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center p-4 bg-blue-50 border-b border-gray-100">
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-500 text-white rounded-lg flex items-center justify-center space-x-2 hover:bg-red-600 transition-all shadow-sm"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="text-white" />
            <span>Logout</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">
            Account Details
          </h3>
          <div className="space-y-4">
            <ProfileItem 
              icon={faUser} 
              label="Name" 
              value={organiserProfile.name || "Not provided"} 
            />
            <ProfileItem 
              icon={faEnvelope} 
              label="Email" 
              value={organiserProfile.email || "Not provided"} 
            />
            <ProfileItem 
              icon={faLock} 
              label="Password" 
              value={organiserProfile.password ? "••••••••" : "Not set"} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProfileItemProps {
  icon: any;
  label: string;
  value: string;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ icon, label, value }) => (
  <div className="flex items-start">
    <div className="bg-blue-100 p-3 rounded-lg mr-4 text-[#246d8c]">
      <FontAwesomeIcon icon={icon} className="w-4 h-4" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-gray-800 font-medium text-base">
        {value}
      </p>
    </div>
  </div>
);

export default OrganiserProfile;