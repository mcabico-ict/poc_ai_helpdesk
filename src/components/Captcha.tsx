
import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Lock, ArrowRight } from 'lucide-react';
import { ticketStore } from '../store';

interface CaptchaProps {
  onVerify: () => void;
}

const Captcha: React.FC<CaptchaProps> = ({ onVerify }) => {
  const [captchaCode, setCaptchaCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState(false);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setUserInput('');
    setError(false);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.toUpperCase() === captchaCode) {
      ticketStore.logAudit('Captcha Success');
      onVerify();
    } else {
      setError(true);
      generateCaptcha();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 z-[100] font-sans">
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
        <div className="grid grid-cols-12 gap-4 w-[150%] h-[150%] -rotate-12 translate-x-[-10%] translate-y-[-10%]">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="text-white text-[10px] font-bold">UBI-SECURE</div>
          ))}
        </div>
      </div>

      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 relative z-10">
        <div className="bg-black p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-10 border border-gray-700 rounded bg-black flex items-center justify-center">
            <svg viewBox="0 0 100 60" width="100%" height="100%">
               <rect width="100" height="60" fill="black" />
               <text x="50%" y="45" textAnchor="middle" fontFamily="Arial Black" fontWeight="900" fontSize="38" fill="#FFD700">UBi</text>
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">System Access</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">Verification Required</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-full mb-2">
              <ShieldCheck size={24} />
            </div>
            <p className="text-sm text-gray-600">Please verify that you are a human user to access the Support Terminal.</p>
          </div>

          <div className="relative group">
            <div className="bg-gray-100 rounded-xl p-6 flex items-center justify-center border-2 border-dashed border-gray-200 select-none overflow-hidden relative">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
              <div className="absolute inset-0 opacity-10 rotate-45" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent 100%)', backgroundSize: '10px 10px' }}></div>
              <span className="text-3xl font-black tracking-[0.4em] text-gray-800 italic relative z-10 drop-shadow-sm font-mono">
                {captchaCode}
              </span>
              <button 
                type="button"
                onClick={generateCaptcha}
                className="absolute right-3 bottom-3 p-1.5 bg-white shadow-sm rounded-lg text-gray-400 hover:text-blue-600 transition-colors border border-gray-100"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                required
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value.toUpperCase());
                  setError(false);
                }}
                placeholder="Enter the code above"
                className={`w-full bg-gray-50 border-2 rounded-xl px-4 py-3.5 text-center text-lg font-bold tracking-widest focus:ring-4 focus:ring-blue-100 transition-all outline-none ${
                  error ? 'border-red-300 text-red-600 shake' : 'border-gray-100 text-gray-800'
                }`}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                <Lock size={18} />
              </div>
            </div>

            {error && <p className="text-xs text-red-500 text-center font-bold animate-pulse">Verification failed.</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Verify & Enter
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default Captcha;
