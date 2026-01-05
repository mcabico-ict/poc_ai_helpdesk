
import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Lock, ArrowRight } from 'lucide-react';

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
      onVerify();
    } else {
      setError(true);
      generateCaptcha();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0b1324] flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="bg-black p-6 flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-8 rounded bg-black border border-gray-800 flex items-center justify-center">
             <span className="text-yellow-400 font-black text-xl leading-none">UBi</span>
          </div>
          <h1 className="text-white font-bold text-lg">IT Support Terminal</h1>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">Secure Verification Required</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center border-2 border-dashed border-gray-200 relative select-none">
            <span className="text-3xl font-black tracking-[0.3em] text-gray-800 italic font-mono">
              {captchaCode}
            </span>
            <button 
              type="button"
              onClick={generateCaptcha}
              className="absolute right-2 bottom-2 p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              required
              value={userInput}
              onChange={(e) => setUserInput(e.target.value.toUpperCase())}
              placeholder="Enter Code"
              className={`w-full bg-gray-50 border-2 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-widest focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                error ? 'border-red-300 text-red-600' : 'border-gray-100 text-gray-800'
              }`}
            />
            <button
              type="submit"
              className="w-full bg-[#1a202c] hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Verify & Enter
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Captcha;
