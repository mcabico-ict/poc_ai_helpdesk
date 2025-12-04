import React, { useState, useEffect } from 'react';
import { MOCK_PMS_SCHEDULE } from '../constants';
import { ticketStore } from '../store';
import { Ticket, TicketStatus, TicketSeverity } from '../types';
import { Search, Filter, Info, X, Clock, Plus, RefreshCw, Loader2, ClipboardList, UserCheck } from 'lucide-react';

const TicketManager: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>(ticketStore.getTickets());
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to store updates
    const unsubscribe = ticketStore.subscribe(() => {
      setTickets(ticketStore.getTickets());
      setIsSyncing(ticketStore.isSyncing());
    });
    // Check initial state
    setIsSyncing(ticketStore.isSyncing());
    
    return unsubscribe;
  }, []);

  const handleRefresh = () => {
    ticketStore.fetchTickets();
  };

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const getSeverityColor = (sev: TicketSeverity) => {
    switch(sev) {
        case TicketSeverity.CRITICAL: return 'bg-red-100 text-red-700 border-red-200';
        case TicketSeverity.MAJOR: return 'bg-orange-100 text-orange-700 border-orange-200';
        case TicketSeverity.MINOR: return 'bg-blue-50 text-blue-700 border-blue-100';
        default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getStatusColor = (status: TicketStatus) => {
      switch(status) {
          case TicketStatus.DONE: return 'bg-green-100 text-green-700';
          case TicketStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700';
          case TicketStatus.ON_HOLD: return 'bg-yellow-100 text-yellow-700';
          case TicketStatus.OPEN: return 'bg-purple-100 text-purple-700';
          case TicketStatus.CLOSED: return 'bg-gray-200 text-gray-700';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      
      {/* Schedule Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
             <div>
                <h3 className="text-lg font-bold text-gray-800">Preventive Maintenance Schedule</h3>
                <p className="text-sm text-gray-400">Over 1277 Devices Tracked</p>
             </div>
             <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100">PMS Planning</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4">Device ID</th>
                        <th className="px-6 py-4">Item</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Jan - Mar</th>
                        <th className="px-6 py-4">Apr - Jun</th>
                        <th className="px-6 py-4">Jul - Sep</th>
                        <th className="px-6 py-4">Oct - Dec</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {MOCK_PMS_SCHEDULE.map((item) => (
                        <tr key={item.deviceId} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 text-blue-600 font-medium">{item.deviceId}</td>
                            <td className="px-6 py-4 text-gray-600">{item.item}</td>
                            <td className="px-6 py-4 text-gray-500">{item.location}</td>
                            <td className="px-6 py-4">
                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${item.q1Status === 'DUNAN' ? 'bg-green-500 text-white' : 'bg-red-400 text-white'}`}>{item.q1Date} {item.q1Status}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${item.q2Status === 'DUNAN' ? 'bg-green-500 text-white' : 'bg-red-400 text-white'}`}>{item.q2Date} {item.q2Status}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${item.q3Status === 'DUNAN' ? 'bg-green-500 text-white' : 'bg-red-400 text-white'}`}>{item.q3Date} {item.q3Status}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${item.q4Status === 'DUNAN' ? 'bg-blue-500 text-white' : 'bg-red-400 text-white'}`}>{item.q4Date} {item.q4Status}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Ticket Sheet Section */}
      <div className="space-y-4 pt-4">
         <div className="flex justify-between items-center">
             <div>
                 <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    Support Ticket Sheet
                    {isSyncing && <Loader2 size={16} className="animate-spin text-blue-600" />}
                 </h3>
                 <p className="text-sm text-gray-400">All active and resolved requests</p>
             </div>
             <div className="flex gap-2">
                <div className="relative">
                    <input type="text" placeholder="Search ID or Subject..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
                <button onClick={handleRefresh} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Sync with Google Sheets">
                    <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                </button>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
                    <Plus size={16} />
                    New Ticket
                </button>
             </div>
         </div>
         
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                     <tr>
                         <th className="px-6 py-4 w-24">Ticket ID</th>
                         <th className="px-6 py-4">Severity</th>
                         <th className="px-6 py-4 w-1/3">Subject / Category</th>
                         <th className="px-6 py-4">Requester</th>
                         <th className="px-6 py-4">Technician</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {tickets.map(ticket => (
                         <tr key={ticket.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedTicketId(ticket.id)}>
                             <td className="px-6 py-4">
                                 <span className="font-mono text-gray-500">#{ticket.id}</span>
                             </td>
                             <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getSeverityColor(ticket.severity)}`}>
                                     {ticket.severity}
                                 </span>
                             </td>
                             <td className="px-6 py-4">
                                 <div className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{ticket.subject}</div>
                                 <div className="text-xs text-gray-400 mt-0.5">{ticket.category} &bull; {ticket.location}</div>
                             </td>
                             <td className="px-6 py-4">
                                 <div className="text-gray-600 truncate max-w-[150px]">{ticket.requesterEmail !== 'N/A' ? ticket.requesterEmail : `PIN: ${ticket.employeePin}`}</div>
                                 <div className="text-[10px] text-gray-400">{ticket.dateCreated}</div>
                             </td>
                             <td className="px-6 py-4">
                                 {ticket.technician !== 'Unassigned' ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                            {ticket.technician.charAt(0)}
                                        </div>
                                        <span className="text-gray-600">{ticket.technician}</span>
                                    </div>
                                 ) : (
                                     <span className="text-gray-400 italic">Unassigned</span>
                                 )}
                             </td>
                             <td className="px-6 py-4">
                                 <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(ticket.status)}`}>
                                     {ticket.status}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <button className="text-gray-400 hover:text-blue-600 p-1">
                                     <Info size={18} />
                                 </button>
                             </td>
                         </tr>
                     ))}
                     {tickets.length === 0 && !isSyncing && (
                         <tr>
                             <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                 No tickets found. Please wait for sync or create a new one.
                             </td>
                         </tr>
                     )}
                     {tickets.length === 0 && isSyncing && (
                         <tr>
                             <td colSpan={7} className="px-6 py-12 text-center text-gray-400 flex flex-col items-center gap-2">
                                 <Loader2 className="animate-spin text-blue-600" size={24} />
                                 <span>Syncing with Google Sheets...</span>
                             </td>
                         </tr>
                     )}
                 </tbody>
             </table>
         </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white rounded-t-xl sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-1.5 rounded">
                            <Info size={20} />
                        </div>
                        <h3 className="font-bold text-lg">Ticket Details #{selectedTicket.id}</h3>
                    </div>
                    <button onClick={() => setSelectedTicketId(null)} className="hover:bg-blue-700 p-1 rounded transition-colors"><X size={20}/></button>
                </div>
                
                <div className="p-8 space-y-6">
                    {/* Header Info */}
                    <div className="flex items-start justify-between border-b border-gray-100 pb-6">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-800 leading-tight mb-2">{selectedTicket.subject}</h2>
                            <div className="flex flex-wrap gap-2 text-sm">
                                <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">{selectedTicket.category}</span>
                                <span className="text-gray-400 flex items-center">&bull;</span>
                                <span className="text-gray-500">{selectedTicket.dateCreated}</span>
                            </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${getSeverityColor(selectedTicket.severity)}`}>
                            {selectedTicket.severity}
                        </div>
                    </div>

                    {/* Requester Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                U
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Requester</p>
                                <p className="text-sm text-blue-600">{selectedTicket.requesterEmail}</p>
                                {selectedTicket.employeePin && (
                                    <p className="text-xs text-gray-500">PIN: {selectedTicket.employeePin}</p>
                                )}
                                <p className="text-xs text-gray-500">Contact: {selectedTicket.contactNumber}</p>
                            </div>
                        </div>
                        
                        <div className="bg-orange-50 p-4 rounded-lg flex items-center gap-4 border border-orange-100">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                                <UserCheck size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Immediate Superior</p>
                                {selectedTicket.immediateSuperior ? (
                                    <>
                                        <p className="text-sm text-gray-700 font-medium">{selectedTicket.immediateSuperior}</p>
                                        <p className="text-xs text-gray-500">{selectedTicket.superiorContact}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Not recorded</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Fields Grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
                        <div className="space-y-1">
                            <p className="text-gray-400 font-medium text-xs uppercase tracking-wider">Technician</p>
                            <p className="font-medium text-gray-800">{selectedTicket.technician}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-400 font-medium text-xs uppercase tracking-wider">Status</p>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(selectedTicket.status)}`}>
                                {selectedTicket.status}
                            </span>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <p className="text-gray-400 font-medium text-xs uppercase tracking-wider">Location / Property ID</p>
                            <p className="font-medium text-gray-800 flex items-center gap-2">
                                {selectedTicket.location}
                                <span className="text-gray-300">|</span>
                                <span className="text-gray-500 bg-blue-50 px-2 rounded border border-blue-100">PID: {selectedTicket.pid}</span>
                            </p>
                        </div>
                    </div>

                    {/* Description/Notes */}
                    <div className="space-y-2">
                         <h4 className="text-gray-400 font-medium text-xs uppercase tracking-wider">Issue Description</h4>
                         <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-line border border-gray-200">
                             {selectedTicket.description}
                         </div>
                    </div>

                    {/* AI Troubleshooting Log */}
                    {selectedTicket.troubleshootingLog && (
                        <div className="space-y-2">
                             <h4 className="text-blue-500 font-medium text-xs uppercase tracking-wider flex items-center gap-1">
                                <ClipboardList size={12}/>
                                Initial AI Troubleshooting Log
                             </h4>
                             <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-line border border-blue-100 font-mono text-xs">
                                 {selectedTicket.troubleshootingLog}
                             </div>
                        </div>
                    )}
                    
                    {/* Tech Notes */}
                    {selectedTicket.techNotes && (
                         <div className="space-y-2">
                             <h4 className="text-gray-400 font-medium text-xs uppercase tracking-wider">Technician Resolution Notes</h4>
                             <div className="bg-yellow-50 p-4 rounded-lg text-sm text-gray-800 border border-yellow-200 shadow-sm">
                                 {selectedTicket.techNotes}
                             </div>
                         </div>
                    )}

                </div>
                
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center rounded-b-xl sticky bottom-0">
                    <span className="text-xs text-gray-400">Ref ID: {selectedTicket.id}</span>
                    <div className="flex gap-3">
                        <button onClick={() => setSelectedTicketId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white text-gray-600 transition-colors">Close</button>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">Update Status</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TicketManager;