import React, { useState, useEffect } from 'react';
import { ticketStore } from '../store';
import { Ticket, TicketStatus, TicketSeverity } from '../types';
import { Search, RefreshCw, Lock, Unlock, ChevronRight, Circle, AlertCircle } from 'lucide-react';

const TicketManager: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>(ticketStore.getTickets());
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Lock State
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = ticketStore.subscribe(() => {
      setTickets(ticketStore.getTickets());
      setIsSyncing(ticketStore.isSyncing());
    });
    setIsSyncing(ticketStore.isSyncing());
    return unsubscribe;
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock validation - in real app, validate against a list or API
    if (pinInput.length >= 4) {
      setIsLocked(false);
      setError('');
    } else {
      setError('Invalid PIN format');
    }
  };

  const getStatusDot = (status: TicketStatus) => {
      switch(status) {
          case TicketStatus.DONE: return 'text-green-500';
          case TicketStatus.IN_PROGRESS: return 'text-blue-500';
          case TicketStatus.OPEN: return 'text-purple-500';
          default: return 'text-gray-400';
      }
  };

  if (isLocked) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50">
              <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                      <Lock size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Ticket Console</h2>
                  <p className="text-sm text-gray-500 mb-6">Enter your Employee PIN to view tickets</p>
                  
                  <form onSubmit={handleUnlock} className="space-y-4">
                      <input 
                        type="password" 
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="• • • • •"
                        className="w-full text-center text-2xl tracking-widest py-3 border-b-2 border-gray-200 focus:border-blue-600 focus:outline-none bg-transparent transition-colors placeholder:text-gray-300"
                        autoFocus
                      />
                      {error && <p className="text-xs text-red-500">{error}</p>}
                      <button type="submit" className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-black transition-colors">
                          Access Console
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Active Tickets</h2>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    {isSyncing ? 'Syncing...' : `Last updated: ${new Date().toLocaleTimeString()}`}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => ticketStore.fetchTickets()} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                    <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                </button>
                <button onClick={() => setIsLocked(true)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors" title="Lock Console">
                    <Lock size={16} />
                </button>
            </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Filter by ID, subject, or PID..." 
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 transition-shadow"
                />
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
            {tickets.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No tickets found.</div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {tickets.map(ticket => (
                        <div 
                            key={ticket.id} 
                            onClick={() => setSelectedTicketId(ticket.id === selectedTicketId ? null : ticket.id)}
                            className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group ${selectedTicketId === ticket.id ? 'bg-blue-50/50' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-mono text-xs text-gray-400">#{ticket.id}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                        ticket.severity === TicketSeverity.CRITICAL ? 'bg-red-50 text-red-600 border-red-100' : 
                                        'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                        {ticket.severity}
                                    </span>
                                    <Circle size={8} className={`fill-current ${getStatusDot(ticket.status)}`} />
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {ticket.subject}
                            </h3>
                            <div className="flex justify-between items-end">
                                <div className="text-xs text-gray-500">
                                    <span className="font-medium text-gray-700">{ticket.category}</span>
                                    <span className="mx-1.5 text-gray-300">|</span>
                                    {ticket.location}
                                </div>
                                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                            </div>
                            
                            {/* Expanded Details Mini-View */}
                            {selectedTicketId === ticket.id && (
                                <div className="mt-4 pt-3 border-t border-blue-100/50 animate-in slide-in-from-top-1 duration-200">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <p className="text-gray-400 uppercase tracking-wider text-[10px] mb-0.5">Requester</p>
                                            <p className="text-gray-700 font-medium truncate">{ticket.requesterEmail}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 uppercase tracking-wider text-[10px] mb-0.5">Technician</p>
                                            <p className="text-gray-700 font-medium">{ticket.technician}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-gray-400 uppercase tracking-wider text-[10px] mb-0.5">Description</p>
                                            <p className="text-gray-600 leading-relaxed bg-white p-2 rounded border border-gray-100">
                                                {ticket.description}
                                            </p>
                                        </div>
                                        {ticket.troubleshootingLog && (
                                            <div className="col-span-2">
                                                <p className="text-blue-400 uppercase tracking-wider text-[10px] mb-0.5">AI Log</p>
                                                <p className="text-gray-600 leading-relaxed bg-blue-50/50 p-2 rounded border border-blue-100 font-mono text-[10px]">
                                                    {ticket.troubleshootingLog}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default TicketManager;