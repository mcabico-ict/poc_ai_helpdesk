
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, Sparkles, Trash2, PenBox, LogOut, RefreshCw } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ticketStore } from '../store';
import { ChatMessage, TicketSeverity } from '../types';

interface AIChatProps {
  onReset: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ onReset }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      content: "Hello! I'm your UBI IT Support Assistant. May I know your name, please?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userPrompt = input;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userPrompt,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      const result = await geminiService.sendMessage(history, userPrompt);
      
      const aiResponse = result.text || "I apologize, I couldn't process that.";
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiResponse,
        timestamp: new Date(),
        isToolCall: result.isToolResponse
      };

      setMessages(prev => [...prev, botMessage]);

      // LOG TO AUDIT: datetime, Activity, UserMessage, AIMessage
      ticketStore.logAudit('Chat', userPrompt, aiResponse);

    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'Connection error.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0 shadow-sm">
         <div className="flex items-center gap-4">
             <div className="shrink-0 bg-black rounded p-1" style={{ width: '50px', height: '32px' }}>
                <svg viewBox="0 0 100 60" width="100%" height="100%">
                    <text x="50%" y="45" textAnchor="middle" fontFamily="Arial Black" fontWeight="900" fontSize="38" fill="#FFD700">UBi</text>
                </svg>
             </div>
             <div>
                <h2 className="text-sm font-bold text-gray-900 leading-tight">IT Support Assistant</h2>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Audit Logging Active</p>
                </div>
             </div>
         </div>
         <div className="flex gap-2">
            <button onClick={() => ticketStore.fetchTickets()} title="Sync Sheet" className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><RefreshCw size={18} /></button>
            <button onClick={onReset} title="Reset Session" className="p-2 text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1">
                <LogOut size={18} />
                <span className="text-[10px] font-bold">LOGOUT</span>
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
        <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-blue-600 text-white'}`}>
                        {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                    </div>
                    <div className={`text-sm p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-gray-800 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'}`}>
                        {msg.content}
                    </div>
                </div>
            </div>
            ))}
            {isLoading && (
              <div className="flex justify-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0"><Loader2 size={14} className="animate-spin" /></div>
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm text-gray-400">Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type your message..." 
              className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 resize-none h-[48px]" 
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              <Send size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
