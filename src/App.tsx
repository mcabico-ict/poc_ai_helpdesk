import React from 'react';
import TicketManager from './components/TicketManager';
import AIChat from './components/AIChat';

const App: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
      {/* Left Panel: Ticket Management (Minimalist List) */}
      <div className="w-1/2 h-full border-r border-gray-200 bg-white flex flex-col">
        <TicketManager />
      </div>

      {/* Right Panel: AI Support (Chat) */}
      <div className="w-1/2 h-full bg-gray-50 flex flex-col">
        <AIChat />
      </div>
    </div>
  );
};

export default App;