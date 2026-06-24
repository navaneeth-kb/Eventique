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
import StudentLayout from './Pages/StudentLayout';
import OrganiserLayout from './Pages/OrganiserLayout';
import HomePage from './Pages/HomePage';
import EventDetails from './Pages/EventDetails';
import OrganiserHomePage from './Pages/OrganiserHomePage';
import EventCreation from './Pages/EventCreation';
import EventCreateSuccess from './Pages/EventCreateSuccess';
import OrganiserEventDetail from './Pages/OrganiserEventDetail';
import OrganiserEditEvent from './Pages/OrganiserEditEvent';
import OrganiserExtraDetails from './Pages/OrganiserExtraDetails';
import OrganiserFeedbackDetails from './Pages/OrganiserFeedbackDetails';
import OrganiserProfile from './Pages/OrganiserProfile';
import Profile from './Pages/Profile';
import EditProfile from './Pages/EditProfile';
import Ticket from './Pages/Ticket';
import Scan from './Pages/Scan';
import Months from './Pages/Months';
import OrganiserCalendar from './Pages/OrganiserCalendar';
import OrganiserLogin from './Pages/OrganiserLogin';

/**
 * Redirects authenticated users away from login/signup pages.
 * Checks Firestore to see if the user has completed their profile:
 *  - If profile exists → redirect to HomePage
 *  - If profile doesn't exist → redirect to AdditionalInfo
 *  - While checking → show nothing (brief flash)
 */
function AuthRedirect({ user, children }: { user: User | null; children: React.ReactNode }) {
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
          setRedirectTo('/additionalinfo');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        // On error, default to additional info to be safe
        setRedirectTo('/additionalinfo');
      }
      setChecking(false);
    };

    checkProfile();
  }, [user]);

  if (checking && user) return null; // Brief loading while checking profile
  if (redirectTo && user) return <Navigate to={redirectTo} />;
  return <>{children}</>;
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
        <Route path="/login" element={<AuthRedirect user={user}><Login /></AuthRedirect>} />
        <Route path="/signup" element={<AuthRedirect user={user}><Signup /></AuthRedirect>} />
        <Route path="/additionalinfo" element={user ? <AdditionalInfo /> : <Navigate to="/login" />} />
        <Route path="/organiser-login" element={user ? <Navigate to="/OrganiserHomePage" /> : <OrganiserLogin />} />

        {/* Student Routes — wrapped in StudentLayout for persistent nav bar */}
        <Route element={user ? <StudentLayout /> : <Navigate to="/login" />}>
          <Route path="/HomePage" element={<HomePage />} />
          <Route path="/HomePage/TicketView" element={<Ticket />} />
          <Route path="/EventDetails" element={<EventDetails />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/HomePage/Profile" element={<Profile />} />
          <Route path="/HomePage/Profile/EditProfile" element={<EditProfile />} />
          <Route path="/HomePage/Months" element={<Months />} />
        </Route>

        {/* Organiser Routes — wrapped in OrganiserLayout for persistent nav bar */}
        <Route element={user ? <OrganiserLayout /> : <Navigate to="/login" />}>
          <Route path="/OrganiserHomePage" element={<OrganiserHomePage />} />
          <Route path="/OrganiserHomePage/EventCreation" element={<EventCreation />} />
          <Route path="/OrganiserHomePage/EventCreateSuccess" element={<EventCreateSuccess />} />
          <Route path="/OrganiserHomePage/OrganiserEventDetail" element={<OrganiserEventDetail />} />
          <Route path="/OrganiserHomePage/EditEvent/:id" element={<OrganiserEditEvent />} />
          <Route path="/OrganiserHomePage/OrganiserEventDetail/Scan/:id" element={<Scan />} />
          <Route path="/OrganiserExtraDetails/:id" element={<OrganiserExtraDetails />} />
          <Route path="/OrganiserFeedbackDetails/:id" element={<OrganiserFeedbackDetails />} />
          <Route path="/OrganiserProfile" element={<OrganiserProfile />} />
          <Route path="/OrganiserHomePage/:id" element={<OrganiserEventDetail />} />
          <Route path="/OrganiserCalendar" element={<OrganiserCalendar />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
