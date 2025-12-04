import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ChatMessage } from '../types';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      content: 'Good day. I am the UBI IT Support Assistant.\n\nTo begin, please state your name and how you would like to be addressed (e.g., Mr., Ms., Engr.).',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (!isLoading) {
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isLoading]);

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
    setIsLoading(true);

    try {
        // FILTER HISTORY: Remove the initial UI greeting (id: '1').
        // Gemini API expects history to often start with User, or be alternating.
        // Sending the initial 'model' greeting before any user message can cause 400 Bad Request.
        const history = messages
            .filter(m => m.id !== '1')
            .map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            }));

        const result = await geminiService.sendMessage(history, userMessage.content);
        
        const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: result.text || "I apologize, but I couldn't generate a response.",
            timestamp: new Date(),
            isToolCall: result.isToolResponse
        };

        setMessages(prev => [...prev, botMessage]);

    } catch (error) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            content: 'Connection error. Please try again.',
            timestamp: new Date()
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Centered Header */}
      <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-center bg-white z-10">
         <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-200">
                <Bot size={20} />
            </div>
            <div className="text-center">
                <h2 className="text-sm font-bold text-gray-900">UBI TechSupport AI</h2>
                <p className="text-xs text-gray-400">Procedure Aware (PM-IT-04)</p>
            </div>
         </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
        <div className="max-w-3xl mx-auto w-full space-y-8">
            {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${
                        msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-100 text-blue-600'
                    }`}>
                        {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                            msg.role === 'user' 
                                ? 'text-white bg-gray-900 p-4 rounded-2xl rounded-tr-sm' 
                                : 'text-gray-700 bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm'
                        }`}>
                            {msg.content}
                        </div>
                        {msg.isToolCall && (
                            <div className="text-[10px] text-blue-500 font-bold flex items-center gap-1.5 opacity-80 px-1">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                Accessing Ticket Database...
                            </div>
                        )}
                    </div>
                </div>
            </div>
            ))}
            
            {isLoading && (
                <div className="flex justify-start">
                    <div className="flex max-w-[85%] gap-4">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0 mt-1 text-blue-600 shadow-sm">
                            <Loader2 size={14} className="animate-spin" />
                        </div>
                        <div className="text-sm text-gray-400 mt-2 font-medium animate-pulse">Thinking...</div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-gray-100">
        <div className="relative max-w-3xl mx-auto">
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="w-full bg-gray-50 border-0 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white block p-4 pr-12 transition-all placeholder:text-gray-400 shadow-inner"
                disabled={isLoading}
                autoFocus
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 transition-colors"
            >
                <Send size={18} />
            </button>
        </div>
        <div className="text-center mt-3 flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity duration-300">
             <AlertCircle size={10} className="text-gray-500"/>
             <p className="text-[10px] text-gray-500">Verify critical info. AI can make mistakes.</p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;