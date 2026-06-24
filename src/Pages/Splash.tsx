import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';

const Splash = () => {
  const [showButtons, setShowButtons] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButtons(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleStudentLogin = () => {
    navigate('/login');
  };

  const handleOrganiserLogin = () => {
    navigate('/organiser-login');
  };

  return (
    <div className="w-full h-screen bg-[#f6fcf7] flex flex-col justify-center items-center">
      {/* Logo with fade-in effect */}
      <img
        src={logo}
        alt="App logo"
        className="mb-8 transition-opacity duration-1000 opacity-100"
        style={{ animation: 'fadeIn 3s ease-in-out' }}
      />
      
      {/* Content after the logo appears */}
      {showButtons && (
        <>
          <div className="text-[#246d8c] text-[32px] font-medium font-['Inter'] mb-4">
            Let's get started
          </div>
          <div className="w-[316px] text-[#246d8c] text-base font-normal font-['Inter'] text-center mb-8">
            Organizers manage events and check in with QR codes. Users register and get tickets in one slide.
          </div>
          <button
            onClick={handleStudentLogin}
            className="w-[295px] py-[13px] bg-[#246d8c] text-white text-base font-medium font-['Inter'] rounded-md mb-4"
          >
            Student Login
          </button>
          <button
            onClick={handleOrganiserLogin}
            className="w-[295px] py-[13px] bg-white text-[#246d8c] text-base font-medium font-['Inter'] rounded-md border-2 border-[#246d8c]"
          >
            Organiser Login
          </button>
        </>
      )}
    </div>
  );
};

export default Splash;
