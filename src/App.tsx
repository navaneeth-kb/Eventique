import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
// @ts-ignore
import { auth } from './firebaseConfig';

import Login from './Pages/Login';
import Splash from './Pages/Splash';
import Signup from './Pages/Signup';
import AdditionalInfo from './Pages/AdditionalInfo';
import StudentLayout from './Pages/Student/StudentLayout';
import OrganiserLayout from './Pages/Organiser/OrganiserLayout';
import HomePage from './Pages/Student/HomePage';
import EventDetails from './Pages/Student/EventDetails';
import OrganiserHomePage from './Pages/Organiser/OrganiserHomePage';
import EventCreation from './Pages/Organiser/EventCreation';
import EventCreateSuccess from './Pages/Organiser/EventCreateSuccess';
import OrganiserEventDetail from './Pages/Organiser/OrganiserEventDetail';
import OrganiserEditEvent from './Pages/Organiser/OrganiserEditEvent';
import OrganiserExtraDetails from './Pages/Organiser/OrganiserExtraDetails';
import OrganiserAttendanceDetails from './Pages/Organiser/OrganiserAttendanceDetails';
import OrganiserDietaryDetails from './Pages/Organiser/OrganiserDietaryDetails';
import OrganiserFeedbackDetails from './Pages/Organiser/OrganiserFeedbackDetails';
import OrganiserProfile from './Pages/Organiser/OrganiserProfile';
import Profile from './Pages/Student/Profile';
import EditProfile from './Pages/Student/EditProfile';
import Ticket from './Pages/Student/Ticket';
import Scan from './Pages/Organiser/Scan';
import Months from './Pages/Student/Months';
import OrganiserCalendar from './Pages/Organiser/OrganiserCalendar';
import OrganiserLogin from './Pages/Organiser/OrganiserLogin';
import AdminDashboard from './Pages/Admin/AdminDashboard';

/**
 * Redirects authenticated students away from login/signup pages.
 */
function StudentAuthRedirect({ user, children }: { user: User | null; children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    const checkProfile = async () => {
      try {
        const db = getFirestore();
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRedirectTo('/HomePage');
        } else {
          // If they are an organiser, don't redirect them to additional info, they shouldn't be here
          const orgRef = doc(db, 'organizers', user.email || '');
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            if (user.email === 'admin@eventique.com') {
              setRedirectTo('/OrganiserHomePage/AdminDashboard');
            } else {
              setRedirectTo('/OrganiserHomePage');
            }
          } else {
            setRedirectTo('/additionalinfo');
          }
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setRedirectTo('/additionalinfo');
      }
      setChecking(false);
    };

    checkProfile();
  }, [user]);

  if (checking && user) return null;
  if (redirectTo && user) return <Navigate to={redirectTo} />;
  return <>{children}</>;
}


/**
 * Protects organiser routes so only users in the 'organizers' collection can access them.
 */
function OrganiserProtectedRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [isOrganiser, setIsOrganiser] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    const checkOrganiser = async () => {
      try {
        if (!user.email) {
          setIsOrganiser(false);
        } else {
          const db = getFirestore();
          const docRef = doc(db, 'organizers', user.email);
          const docSnap = await getDoc(docRef);
          setIsOrganiser(docSnap.exists());
        }
      } catch (error) {
        setIsOrganiser(false);
      }
      setChecking(false);
    };

    checkOrganiser();
  }, [user]);

  if (checking) return (
    <div className="min-h-screen bg-[#e9f7f1] flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-[#246d8c] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user || !isOrganiser) return <Navigate to="/organiser-login" />;
  return <>{children}</>;
}

/**
 * Protects student routes so only users who are not organisers can access them.
 * Note: we could check the 'users' collection strictly, but students who haven't finished additional info 
 * need to be able to access the student routes or at least not be treated as organisers.
 */
function StudentProtectedRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    const checkRole = async () => {
      try {
        if (user.email) {
          const db = getFirestore();
          const orgRef = doc(db, 'organizers', user.email);
          const orgSnap = await getDoc(orgRef);
          
          if (orgSnap.exists()) {
            setIsStudent(false); // They are an organiser, not a student
          } else {
            setIsStudent(true);
          }
        } else {
          setIsStudent(true);
        }
      } catch (error) {
        setIsStudent(false);
      }
      setChecking(false);
    };

    checkRole();
  }, [user]);

  if (checking) return (
    <div className="min-h-screen bg-[#e9f7f1] flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-[#246d8c] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user || !isStudent) return <Navigate to="/login" />;
  return <>{children}</>;
}

/**
 * Saves the current event URL to localStorage and redirects to login.
 * After login, the user will be sent back to this event page.
 */
function EventLoginRedirect() {
  const currentPath = window.location.pathname;
  localStorage.setItem('eventique_redirect', currentPath);
  return <Navigate to="/login" />;
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<StudentAuthRedirect user={user}><Login /></StudentAuthRedirect>} />
        <Route path="/signup" element={<StudentAuthRedirect user={user}><Signup /></StudentAuthRedirect>} />
        <Route path="/additionalinfo" element={user ? <AdditionalInfo /> : <Navigate to="/login" />} />
        
        {/* Organiser Login no longer redirects automatically */}
        <Route path="/organiser-login" element={<OrganiserLogin />} />

        {/* Public Event Route — redirects to login if not authenticated, then back to event */}
        <Route path="/event/:id" element={
          user ? (
            <StudentProtectedRoute user={user}><StudentLayout /></StudentProtectedRoute>
          ) : (
            <EventLoginRedirect />
          )
        }>
          <Route index element={<EventDetails />} />
        </Route>

        {/* Student Routes — wrapped in StudentLayout and StudentProtectedRoute */}
        <Route element={<StudentProtectedRoute user={user}><StudentLayout /></StudentProtectedRoute>}>
          <Route path="/HomePage" element={<HomePage />} />
          <Route path="/HomePage/TicketView" element={<Ticket />} />
          <Route path="/EventDetails" element={<EventDetails />} />
          <Route path="/HomePage/Profile" element={<Profile />} />
          <Route path="/HomePage/Profile/EditProfile" element={<EditProfile />} />
          <Route path="/HomePage/Months" element={<Months />} />
        </Route>

        {/* Organiser Routes — wrapped in OrganiserLayout and OrganiserProtectedRoute */}
        <Route element={<OrganiserProtectedRoute user={user}><OrganiserLayout /></OrganiserProtectedRoute>}>
          <Route path="/OrganiserHomePage" element={<OrganiserHomePage />} />
          <Route path="/OrganiserHomePage/EventCreation" element={<EventCreation />} />
          <Route path="/OrganiserHomePage/EventCreateSuccess" element={<EventCreateSuccess />} />
          <Route path="/OrganiserHomePage/OrganiserEventDetail" element={<OrganiserEventDetail />} />
          <Route path="/OrganiserHomePage/EditEvent/:id" element={<OrganiserEditEvent />} />
          <Route path="/OrganiserHomePage/OrganiserEventDetail/Scan/:id" element={<Scan />} />
          <Route path="/OrganiserExtraDetails/:id" element={<OrganiserExtraDetails />} />
          <Route path="/OrganiserAttendanceDetails/:id" element={<OrganiserAttendanceDetails />} />
          <Route path="/OrganiserDietaryDetails/:id" element={<OrganiserDietaryDetails />} />
          <Route path="/OrganiserFeedbackDetails/:id" element={<OrganiserFeedbackDetails />} />
          <Route path="/OrganiserProfile" element={<OrganiserProfile />} />
          <Route path="/OrganiserHomePage/:id" element={<OrganiserEventDetail />} />
          <Route path="/OrganiserCalendar" element={<OrganiserCalendar />} />
          <Route path="/OrganiserHomePage/AdminDashboard" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
