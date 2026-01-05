
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, Paperclip, FileText, Zap, Smile, X, Trash2, PenBox } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ticketStore } from '../store';
import { ChatMessage, TicketSeverity } from '../types';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      content: 'Hello! I am the UBI IT Support Assistant.\n\nYou can speak to me in English, Tagalog, or Bisaya.\nTo begin, please tell me your Name.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
      requester: '', pid: '', subject: '', category: 'System Unit', 
      location: '', contactNumber: '', superiorContact: '', description: '', severity: TicketSeverity.MINOR
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => {
    scrollToBottom();
    if (!isLoading && !showManualModal) setTimeout(() => inputRef.current?.focus(), 100);
  }, [messages, isLoading, showManualModal]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowTemplates(false);
    setShowEmojiPicker(false);
    setIsLoading(true);

    try {
        const history = messages.filter(m => m.id !== '1').map(m => ({ role: m.role, parts: [{ text: m.content }] }));
        const result = await geminiService.sendMessage(history, userMessage.content);
        
        const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: result.text || "I apologize, but I couldn't generate a response.",
            timestamp: new Date(),
            isToolCall: result.isToolResponse
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Log the exchange to Audit Log
        ticketStore.logAudit('Chat', userMessage.content, botMessage.content);

    } catch (error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'Connection error.', timestamp: new Date() }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setShowManualModal(false);
      try {
          const newTicket = await ticketStore.addTicket({ ...manualForm, troubleshootingLog: 'Manual fallback' });
          const botMessage: ChatMessage = { id: Date.now().toString(), role: 'model', content: `✅ Ticket #${newTicket.id} created manually.`, timestamp: new Date() };
          setMessages(prev => [...prev, botMessage]);
          ticketStore.setCurrentUserQuery(manualForm.requester);
          ticketStore.logAudit('Manual Ticket Creation', manualForm.subject, `Ticket ID: ${newTicket.id}`);
      } catch (err) { alert("Failed."); } finally { setIsLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      try {
          const url = await ticketStore.uploadFile(file);
          const fileMsg = `Uploaded: ${file.name}. URL: ${url}`;
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: fileMsg, timestamp: new Date() }]);
          ticketStore.logAudit('File Upload', file.name, url);
      } catch (error: any) { alert(error.message); } finally { setIsUploading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0 shadow-sm">
         <div className="flex items-center gap-4">
             <div className="shrink-0 shadow-sm border border-gray-900 rounded bg-black overflow-hidden" style={{ width: '60px', height: '40px' }}>
                <svg viewBox="0 0 100 60" width="100%" height="100%">
                    <rect width="100" height="60" fill="black" />
                    <text x="50%" y="50" textAnchor="middle" fontFamily="Arial Black" fontWeight="900" fontSize="38" fill="#FFD700" style={{ letterSpacing: '-2px' }}>UBi</text>
                </svg>
             </div>
             <div>
                <h2 className="text-base font-bold text-gray-900 leading-tight">Ulticon Builders, Inc.</h2>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">IT Support AI &bull; Audit Logging Enabled</p>
             </div>
         </div>
         <div className="flex gap-2">
            <button onClick={() => setShowManualModal(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"><PenBox size={18} /><span className="text-xs font-bold hidden sm:inline">Manual Ticket</span></button>
            <button onClick={() => setMessages([{ id: Date.now().toString(), role: 'model', content: 'Conversation reset.', timestamp: new Date() }])} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
        <div className="max-w-3xl mx-auto w-full space-y-8 pb-4">
            {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-white border text-blue-600'}`}>
                        {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                    </div>
                    <div className="space-y-1 w-full">
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === 'user' ? 'text-white bg-gray-900 p-4 rounded-2xl rounded-tr-sm' : 'text-gray-700 bg-white border p-4 rounded-2xl rounded-tl-sm'}`}>
                            {msg.content}
                        </div>
                    </div>
                </div>
            </div>
            ))}
            {(isLoading || isUploading) && <div className="flex justify-start"><div className="flex max-w-[85%] gap-4"><Loader2 size={14} className="animate-spin text-blue-600" /><span className="text-sm text-gray-400">{isUploading ? "Uploading..." : "Thinking..."}</span></div></div>}
            <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <div className="max-w-3xl mx-auto relative flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-200"><Paperclip size={20} /></button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <div className="relative flex-1">
                <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type message..." rows={1} className="w-full bg-gray-50 border-0 text-sm rounded-xl pl-4 pr-12 py-3.5 shadow-inner resize-none min-h-[48px]" disabled={isLoading || isUploading} />
                <button onClick={handleSend} disabled={!input.trim() || isLoading || isUploading} className="absolute right-2 bottom-2 p-2 text-gray-400 hover:text-blue-600"><Send size={18} /></button>
            </div>
        </div>
      </div>

      {showManualModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-blue-600 p-4 flex justify-between items-center text-white"><h3 className="font-bold">Manual Ticket</h3><button onClick={() => setShowManualModal(false)}><X size={20}/></button></div>
                  <form onSubmit={handleManualSubmit} className="p-6 space-y-4 overflow-y-auto">
                      <input required type="text" className="w-full border rounded p-2 text-sm" placeholder="Requester PIN/Email" value={manualForm.requester} onChange={e => setManualForm({...manualForm, requester: e.target.value})} />
                      <input required type="text" className="w-full border rounded p-2 text-sm" placeholder="Subject" value={manualForm.subject} onChange={e => setManualForm({...manualForm, subject: e.target.value})} />
                      <textarea required className="w-full border rounded p-2 text-sm" rows={3} placeholder="Description" value={manualForm.description} onChange={e => setManualForm({...manualForm, description: e.target.value})} />
                      <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded font-bold">Submit</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default AIChat;
