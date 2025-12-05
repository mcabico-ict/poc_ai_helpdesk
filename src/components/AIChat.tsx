
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, Paperclip, FileText, Zap, ChevronUp } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ticketStore } from '../store';
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
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setShowTemplates(false);
    setIsLoading(true);

    try {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      
      try {
          const url = await ticketStore.uploadFile(file);
          
          const fileMessage: ChatMessage = {
              id: Date.now().toString(),
              role: 'user', 
              content: `I have uploaded a file: ${file.name}. URL: ${url}`,
              timestamp: new Date()
          };
          
          setMessages(prev => [...prev, fileMessage]);
          
          setIsLoading(true);
          const history = messages.filter(m => m.id !== '1').map(m => ({ role: m.role, parts: [{ text: m.content }] }));
          history.push({ role: 'user', parts: [{ text: fileMessage.content }] });
          
          const result = await geminiService.sendMessage(history, "I uploaded a file.");
          
          const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: result.text || "File received.",
                timestamp: new Date(),
                isToolCall: result.isToolResponse
          };
          setMessages(prev => [...prev, botMessage]);

      } catch (error: any) {
          console.error(error);
          
          const errorMessage: ChatMessage = {
              id: Date.now().toString(),
              role: 'model',
              content: `⚠️ UPLOAD FAILED\n\nError: ${error.message || error}\n\nTROUBLESHOOTING STEPS:\n1. Open your Google Apps Script Editor.\n2. Ensure "appsscript.json" has the correct scopes.\n3. CRITICAL: Run the "setup" function manually in the editor to authorize the new Drive permissions.\n4. Ensure Deployment is "Execute as: Me" and "Who has access: Anyone".`,
              timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);

      } finally {
          setIsUploading(false);
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertTemplate = (template: string) => {
      setInput(template);
      setShowTemplates(false);
      inputRef.current?.focus();
  };

  const isFileUploadMessage = (content: string) => {
      return content.startsWith("I have uploaded a file:") && content.includes("URL:");
  };

  const getFileName = (content: string) => {
      try {
          return content.split("I have uploaded a file: ")[1].split(". URL:")[0];
      } catch (e) {
          return "Attachment";
      }
  };

  // Pre-defined Templates
  const TEMPLATES = [
      {
          label: "Ticket Info",
          emoji: "📝",
          text: "Here are my details for the ticket:\n\nPID:\nPIN/Email:\nFull Name:\nLocation:\nSubject:\nDescription:"
      },
      {
          label: "ID Request",
          emoji: "🆔",
          text: "I would like to request a Company ID:\n\nFull Name:\nPosition:\nProject/Dept:\nEmployed > 6 Months? (Yes/No):\nEmergency Contact Name:\nEmergency Contact Address:\nEmergency Contact Number:"
      },
      {
          label: "Account Support",
          emoji: "🔐",
          text: "I need help with my Account:\n\nFull Name:\nDepartment:\nPosition:\nSystem (Acumatica/Email/UBIAS):\nIssue:"
      }
  ];

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Centered Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-center bg-white z-10 shrink-0">
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
        <div className="max-w-3xl mx-auto w-full space-y-8 pb-4">
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
                    <div className="space-y-1 w-full">
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                            msg.role === 'user' 
                                ? 'text-white bg-gray-900 p-4 rounded-2xl rounded-tr-sm' 
                                : 'text-gray-700 bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm'
                        }`}>
                            {isFileUploadMessage(msg.content) ? (
                                <div className="flex items-center gap-2">
                                    <FileText size={16} />
                                    <span>Uploaded: {getFileName(msg.content)}</span>
                                </div>
                            ) : msg.content}
                        </div>
                        {msg.isToolCall && (
                            <div className="text-[10px] text-blue-500 font-bold flex items-center gap-1.5 opacity-80 px-1">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                Accessing Database...
                            </div>
                        )}
                    </div>
                </div>
            </div>
            ))}
            
            {(isLoading || isUploading) && (
                <div className="flex justify-start">
                    <div className="flex max-w-[85%] gap-4">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0 mt-1 text-blue-600 shadow-sm">
                            <Loader2 size={14} className="animate-spin" />
                        </div>
                        <div className="text-sm text-gray-400 mt-2 font-medium animate-pulse">
                            {isUploading ? "Uploading file..." : "Thinking..."}
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <div className="max-w-3xl mx-auto relative">
            
            {/* Templates Popover */}
            {showTemplates && (
                <div className="absolute bottom-full left-0 mb-3 bg-white rounded-xl shadow-xl border border-gray-200 w-64 overflow-hidden animate-in fade-in zoom-in duration-200 z-20">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Quick Templates
                    </div>
                    <div className="p-1">
                        {TEMPLATES.map((t, idx) => (
                            <button
                                key={idx}
                                onClick={() => insertTemplate(t.text)}
                                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 rounded-lg text-sm text-gray-700 flex items-center gap-2 transition-colors"
                            >
                                <span className="text-lg">{t.emoji}</span>
                                <span className="font-medium">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-end gap-2">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors mb-0.5"
                    title="Attach file"
                >
                    <Paperclip size={20} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                />
                
                <div className="relative flex-1">
                     <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className={`absolute left-3 top-3 text-gray-400 hover:text-yellow-500 transition-colors p-1 rounded ${showTemplates ? 'text-yellow-500 bg-yellow-50' : ''}`}
                        title="Templates"
                    >
                        <Zap size={16} fill={showTemplates ? "currentColor" : "none"} />
                    </button>

                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type message... (Shift+Enter for new line)"
                        rows={1}
                        className="w-full bg-gray-50 border-0 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white block pl-12 pr-12 py-3.5 shadow-inner resize-none min-h-[48px] max-h-[150px] scrollbar-hide"
                        disabled={isLoading || isUploading}
                        style={{ height: input ? `${Math.min(input.split('\n').length * 24 + 24, 150)}px` : '48px' }}
                    />
                    
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading || isUploading}
                        className="absolute right-2 bottom-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
            
            <div className="text-center mt-2 flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity duration-300">
                 <AlertCircle size={10} className="text-gray-500"/>
                 <p className="text-[10px] text-gray-500">Verify critical info. AI can make mistakes.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
