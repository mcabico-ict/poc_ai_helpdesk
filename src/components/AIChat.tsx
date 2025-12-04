import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Database } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ChatMessage } from '../types';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      content: 'Hello! I am the UBI Tech Support Assistant. To assist you better, could you please tell me your name and how you would like to be addressed (e.g., Mr., Ms., Engr.)?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        // Prepare history for Gemini
        const history = messages.map(m => ({
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
        console.error("Chat Error:", error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            content: 'I encountered an error connecting to the server. Please try again.',
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
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mx-8 my-8 max-w-5xl lg:mx-auto">
      {/* Header */}
      <div className="bg-blue-600 p-4 flex items-center justify-between shadow-sm shrink-0">
         <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
                <Bot className="text-white" size={24} />
            </div>
            <div>
                <h2 className="text-white font-bold">IT Support Assistant</h2>
                <p className="text-blue-100 text-xs">Powered by Gemini &bull; Procedure Aware (PM-IT-04)</p>
            </div>
         </div>
         <div className="bg-green-500/20 px-3 py-1 rounded border border-green-300/30 text-white text-xs flex items-center gap-1">
            <Database size={12} />
            <span>Live Database</span>
         </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${
                    msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-blue-600 text-white'
                }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Bubble */}
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user' 
                        ? 'bg-gray-800 text-white rounded-tr-none' 
                        : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                }`}>
                    {msg.role === 'model' && msg.isToolCall && (
                        <div className="mb-2 text-xs text-blue-600 font-semibold flex items-center gap-1">
                           <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                           Accessed Google Sheets Database
                        </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-[10px] mt-2 opacity-60 text-right`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                 <div className="flex max-w-[80%] gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-1">
                        <Bot size={16} />
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    </div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="relative flex items-center gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about procedures, ticket #83118, PID, or report an issue..."
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 pr-12 shadow-sm"
                disabled={isLoading}
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
            >
                <Send size={20} />
            </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
            AI can make mistakes. Always verify critical safety information with your supervisor.
        </p>
      </div>
    </div>
  );
};

export default AIChat;