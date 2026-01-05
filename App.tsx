
import React, { useState, useEffect } from 'react';
import AIChat from './components/AIChat';
import Captcha from './components/Captcha';
import TicketManager from './components/TicketManager';
import { ticketStore } from './store';

const App: React.FC = () => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const sessionVerified = sessionStorage.getItem('ubi_verified');
    setIsVerified(sessionVerified === 'true');
  }, []);

  const handleVerify = () => {
    // Log the successful login to Audit Logs
    ticketStore.logAudit('Captcha Success', '', '');
    
    setIsVerified(true);
    sessionStorage.setItem('ubi_verified', 'true');
  };

  const handleReset = () => {
    sessionStorage.removeItem('ubi_verified');
    setIsVerified(false);
  };

  if (isVerified === null) return null; // Prevent flicker

  if (!isVerified) {
    return <Captcha onVerify={handleVerify} />;
  }

  return (
    <div className="relative flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900 animate-in fade-in duration-500">
      <div className="w-full h-full flex flex-col">
        <AIChat onReset={handleReset} />
      </div>
      <TicketManager />
    </div>
  );
};

export default App;
