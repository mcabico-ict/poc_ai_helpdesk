
import React, { useState, useEffect } from 'react';
import { ticketStore } from '../store';
import { Ticket, TicketStatus, TicketSeverity } from '../types';
import { RefreshCw, ChevronRight, Circle, ClipboardList, X, Paperclip, ExternalLink, Loader2, Info } from 'lucide-react';

const TicketManager: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>(ticketStore.getTickets());
  const [currentUserQuery, setCurrentUserQuery] = useState<string | null>(ticketStore.getCurrentUserQuery());
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = ticketStore.subscribe(() => {
      setTickets(ticketStore.getTickets());
      setCurrentUserQuery(ticketStore.getCurrentUserQuery());
      setIsSyncing(ticketStore.isSyncing());
    });
    // Initialize
    setCurrentUserQuery(ticketStore.getCurrentUserQuery());
    setIsSyncing(ticketStore.isSyncing());
    return unsubscribe;
  }, []);

  // Filter tickets based on the AI-identified user
  useEffect(() => {
    if (!currentUserQuery) {
        setFilteredTickets([]);
        return;
    }

    const query = currentUserQuery.toLowerCase();
    const matches = tickets.filter(t => 
        (t.employeePin && String(t.employeePin).toLowerCase() === query) ||
        (t.requesterEmail && String(t.requesterEmail).toLowerCase().includes(query)) ||
        (t.pid && String(t.pid).includes(query))
    );
    setFilteredTickets(matches);
  }, [tickets, currentUserQuery]);

  const handleClose = () => {
      ticketStore.setCurrentUserQuery(null);
  };

  const getStatusDot = (status: TicketStatus) => {
      switch(status) {
          case TicketStatus.DONE: return 'text-green-500';
          case TicketStatus.IN_PROGRESS: return 'text-blue-500';
          case TicketStatus.OPEN: return 'text-purple-500';
          default: return 'text-gray-400';
      }
  };
  
  // If no user identified OR no tickets found for that user, Hide the window
  if (!currentUserQuery || filteredTickets.length === 0) {
      return null;
  }

  const getAttachments = (urlStr?: string) => {
      if (!urlStr) return [];
      return urlStr.split(',').map(u => u.trim()).filter(Boolean);
  };

  return (
    <div className="absolute top-20 right-8 z-50 w-full max-w-md animate-in slide-in-from-right-4 duration-300">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
            
            {/* Window Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white/50">
                <div>
                    <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        My Tickets
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">{filteredTickets.length}</span>
                    </h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">ID: {currentUserQuery}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => ticketStore.fetchTickets()} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100">
                        <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                    </button>
                    <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto">
                <div className="divide-y divide-gray-50">
                    {filteredTickets.map(ticket => (
                        <div 
                            key={ticket.id} 
                            onClick={() => setSelectedTicketId(ticket.id === selectedTicketId ? null : ticket.id)}
                            className={`px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors group ${selectedTicketId === ticket.id ? 'bg-blue-50/40' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-mono text-[10px] text-gray-400">#{ticket.id}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                        ticket.severity === TicketSeverity.CRITICAL ? 'bg-red-50 text-red-600 border-red-100' : 
                                        'bg-gray-100 text-gray-500 border-gray-200'
                                    }`}>
                                        {ticket.severity}
                                    </span>
                                    <Circle size={6} className={`fill-current ${getStatusDot(ticket.status)}`} />
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {ticket.subject}
                            </h3>
                            <div className="flex justify-between items-end">
                                <div className="text-xs text-gray-500">
                                    <span className="font-medium">{ticket.category}</span>
                                </div>
                                <ChevronRight size={14} className={`text-gray-300 transition-transform ${selectedTicketId === ticket.id ? 'rotate-90' : ''}`} />
                            </div>
                            
                            {/* Expanded Details */}
                            {selectedTicketId === ticket.id && (
                                <div className="mt-3 pt-3 border-t border-blue-100/50 animate-in slide-in-from-top-1 duration-200 cursor-default" onClick={e => e.stopPropagation()}>
                                    <div className="space-y-3 text-xs">
                                        <div className="bg-gray-50 p-2.5 rounded border border-gray-100 text-gray-600 leading-relaxed whitespace-pre-line">
                                            {ticket.description}
                                        </div>

                                        {ticket.attachmentUrl && (
                                            <div className="flex flex-wrap gap-2">
                                                {getAttachments(ticket.attachmentUrl).map((url, idx, arr) => (
                                                    <a 
                                                        key={idx}
                                                        href={url} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded border border-gray-200 transition-colors text-[10px] font-medium"
                                                    >
                                                        <Paperclip size={10} />
                                                        {arr.length > 1 ? `Attachment ${idx + 1}` : 'View Attachment'}
                                                        <ExternalLink size={10} className="ml-1 opacity-50"/>
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center text-gray-500 pt-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                                    {ticket.technician && ticket.technician !== 'Unassigned' ? String(ticket.technician).charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <span>Tech: <strong className="text-gray-700">{ticket.technician || 'Unassigned'}</strong></span>
                                            </div>
                                            <span>Status: <strong className="text-gray-700">{ticket.status}</strong></span>
                                        </div>
                                        
                                        {ticket.troubleshootingLog && (
                                            <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100 text-gray-600">
                                                <div className="flex items-center gap-1.5 text-blue-500 font-bold text-[10px] uppercase mb-1">
                                                    <ClipboardList size={10} />
                                                    AI Activity Log
                                                </div>
                                                <p className="font-mono text-[10px] leading-relaxed whitespace-pre-line">{ticket.troubleshootingLog}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default TicketManager;
