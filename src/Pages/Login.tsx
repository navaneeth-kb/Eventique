import { useState } from 'react';
// @ts-ignore
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import google from '../assets/Login/google.svg';
import logo from '../assets/logo.svg';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const db = getFirestore();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);

      // After Google sign-in, check if the user exists in the 'users' collection
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // User found with completed profile, navigate to the home page
          navigate('/HomePage');
        } else {
          // First-time user — collect additional info before proceeding
          navigate('/additionalinfo');
        }
      } else {
        setError('Google sign-in failed.');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100vh] bg-[#f6fcf7] flex flex-col justify-center items-center">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <img src={logo} alt="Eventique Logo" className="w-32 h-auto mb-2" />

        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-[#246d8c] text-2xl font-bold mb-2">Student Login</h1>
          <p className="text-[#246d8c]/60 text-sm">Sign in with your Google account to continue</p>
        </div>

        {/* Google Sign-In Button */}
        <button 
          className="bg-transparent flex items-center justify-center p-2 disabled:opacity-50" 
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <img src={google} alt="Sign in with Google" />
        </button>

        {loading && (
          <div className="flex items-center gap-2 text-[#246d8c] text-sm">
            <div className="w-4 h-4 border-2 border-[#246d8c] border-t-transparent rounded-full animate-spin"></div>
            Signing in...
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm text-center max-w-[295px]">{error}</div>
        )}

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

export default Login;
