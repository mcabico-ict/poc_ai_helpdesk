
import React, { useState, useEffect } from 'react';
import TicketManager from './components/TicketManager';
import AIChat from './components/AIChat';
import Captcha from './components/Captcha';

const App: React.FC = () => {
  const [isVerified, setIsVerified] = useState(false);

  // Use session storage to keep the user verified during a session, 
  // but reset on fresh tab/close.
  useEffect(() => {
    const sessionVerified = sessionStorage.getItem('ubi_verified');
    if (sessionVerified === 'true') {
      setIsVerified(true);
    }
  }, []);

  const handleVerify = () => {
    setIsVerified(true);
    sessionStorage.setItem('ubi_verified', 'true');
  };

  if (!isVerified) {
    return <Captcha onVerify={handleVerify} />;
  }

  return (
    <div className="relative flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900 animate-in fade-in duration-500">
      {/* Full Screen Chat */}
      <div className="w-full h-full flex flex-col">
        <AIChat />
      </div>

      {/* Ticket Manager Overlay (Controlled internally by store state) */}
      <TicketManager />
    </div>
  );
};

export default App;
