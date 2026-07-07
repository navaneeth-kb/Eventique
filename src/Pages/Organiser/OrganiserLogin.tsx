import { useState } from 'react';
// @ts-ignore
import { auth } from '../../firebaseConfig';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import logo from '../../assets/logo.svg';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const OrganiserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    // Force sign out when landing on this page to disable automatic login
    signOut(auth).catch(console.error);
  }, []);

  const handleEmailSignIn = async (e: any) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use Firebase Authentication to sign in the organiser
      await signInWithEmailAndPassword(auth, email, password);

      // Verify the user exists in the 'organizers' collection
      const docRef = doc(db, 'organizers', email);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Organiser found, navigate to the organiser dashboard
        if (email === 'admin@eventique.com') {
          navigate('/OrganiserHomePage/AdminDashboard');
        } else {
          navigate('/OrganiserHomePage');
        }
      } else {
        console.error('No such user found in organizers');
        setError('No organiser account found with this email.');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      setError('Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100vh] bg-[#f6fcf7] flex flex-col justify-center items-center">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <img src={logo} alt="Eventique Logo" className="w-32 h-auto mb-2" />

        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-[#246d8c] text-2xl font-bold mb-2">Organiser Login</h1>
          <p className="text-[#246d8c]/60 text-sm">Sign in with your organiser credentials</p>
        </div>

        {/* Email/Password Form */}
        <form className="flex flex-col items-center gap-4" onSubmit={handleEmailSignIn}>
          <div className="w-[295px] h-12 px-4 py-[13px] rounded-md border border-[#e5e7eb] flex items-center bg-white">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-[#111112]/60 text-base font-normal focus:outline-none bg-transparent"
              required
            />
          </div>
          <div className="w-[295px] h-12 px-4 py-[13px] rounded-md border border-[#e5e7eb] flex items-center bg-white justify-between">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-[#111112]/60 text-base font-normal focus:outline-none bg-transparent"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none ml-2"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center max-w-[295px]">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-[295px] py-[13px] bg-[#246d8c] text-white text-base font-medium rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {loading ? 'Signing in...' : 'Log in'}
          </button>
        </form>

        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="text-[#246d8c]/60 text-sm hover:text-[#246d8c] transition-colors"
        >
          ← Back to home
        </button>
      </div>
    </div>
  );
};

export default OrganiserLogin;
