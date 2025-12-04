
import React from 'react';
import TicketManager from './components/TicketManager';
import AIChat from './components/AIChat';

const App: React.FC = () => {
  return (
    <div className="relative flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
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
