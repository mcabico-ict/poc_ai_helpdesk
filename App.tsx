
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
    setIsVerified(true);
    sessionStorage.setItem('ubi_verified', 'true');
    // Audit log for successful entry
    ticketStore.logAudit('Captcha Success', '', '');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ubi_verified');
    setIsVerified(false);
  };

  if (isVerified === null) return null;

  if (!isVerified) {
    return <Captcha onVerify={handleVerify} />;
  }

  return (
    <div className="relative flex h-screen bg-white overflow-hidden font-sans text-gray-900">
      <div className="w-full h-full flex flex-col">
        <AIChat onLogout={handleLogout} />
      </div>
      <TicketManager />
    </div>
  );
};

export default App;
