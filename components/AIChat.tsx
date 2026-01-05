
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, Sparkles, Paperclip, Smile, Zap, PenBox, Trash2, LogOut, AlertCircle } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ticketStore } from '../store';
import { ChatMessage } from '../types';

interface AIChatProps {
  onLogout: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ onLogout }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      content: "Hello! I am the UBI IT Support Assistant.\n\nYou can speak to me in English, Tagalog, or Bisaya.\nTo begin, please tell me your Name.",
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
      
      const aiResponse = result.text || "I apologize, I encountered an error.";
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiResponse,
        timestamp: new Date(),
        isToolCall: result.isToolResponse
      };

      setMessages(prev => [...prev, botMessage]);

      // AUDIT LOG: Log both the question and the answer
      ticketStore.logAudit('Chat', userPrompt, aiResponse);

    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'Connection error.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header matching screenshot */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0">
         <div className="flex items-center gap-3">
             <div className="shrink-0 bg-black rounded p-1.5 flex items-center justify-center" style={{ width: '48px', height: '32px' }}>
                <span className="text-[#FFD700] font-black text-lg tracking-tighter leading-none">UBi</span>
             </div>
             <div>
                <h2 className="text-sm font-bold text-[#1e293b] leading-tight">Ulticon Builders, Inc.</h2>
                <p className="text-[10px] text-gray-400 font-medium">IT SUPPORT AI • PM-IT-04</p>
             </div>
         </div>
         <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors">
                <PenBox size={16} />
                <span className="text-[11px] font-semibold underline underline-offset-4">Manual Ticket</span>
            </button>
            <button onClick={onLogout} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                <LogOut size={16} />
            </button>
         </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-[#1e293b] text-white' : 'bg-white border border-blue-100 text-blue-500 shadow-sm'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} className="text-blue-400" />}
                </div>
                <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-[#1e293b] text-white rounded-tr-none' 
                    : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'
                }`}>
                    {msg.content}
                </div>
            </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-blue-100 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-blue-500" /></div>
                <div className="text-xs text-gray-400 italic">Support Assistant is typing...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area matching screenshot */}
      <div className="p-4 bg-white border-t border-gray-50 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-white border border-black rounded-xl p-1.5 pl-3">
            <div className="flex items-center gap-3 px-2 text-gray-400 shrink-0">
                <button className="hover:text-blue-500 transition-colors"><Paperclip size={18} /></button>
                <button className="hover:text-blue-500 transition-colors"><Smile size={18} /></button>
                <button className="hover:text-blue-500 transition-colors"><Zap size={18} /></button>
            </div>
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type message... (Shift+Enter for new line)" 
              className="flex-1 border-0 text-[13px] focus:ring-0 placeholder:text-gray-300 py-2" 
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              className="p-2.5 text-gray-300 hover:text-blue-600 disabled:opacity-30 transition-all"
            >
              <Send size={18} />
            </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
            <AlertCircle size={10}/> Verify critical info. AI can make mistakes.
        </p>
      </div>
    </div>
  );
};

export default AIChat;
