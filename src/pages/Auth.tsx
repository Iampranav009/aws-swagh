import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] rounded-full bg-[#7C3AED]/20 blur-[120px]" />
      <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#00CFFF]/20 blur-[120px]" />

      <div className="liquid-glass w-full max-w-md p-8 sm:p-10 rounded-[2rem] border border-white/10 shadow-2xl relative z-10 text-center">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="mt-4 mb-8 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#00CFFF] flex items-center justify-center shadow-lg border border-white/20">
            <span className="text-2xl">🚀</span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Program Ended
        </h2>
        <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-6">
          This program has officially ended. Thank you to everyone who participated! 
          Stay tuned for another exciting program coming soon.
        </p>

        <div className="space-y-4 border-t border-white/10 pt-6">
          <p className="text-white/90 text-sm font-medium">
            Till then, join our community to stay updated!
          </p>
          <a
            href="https://chat.whatsapp.com/GAfhZWodmWy7DObGfVfJ1q"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:opacity-95 text-white font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(37,211,102,0.4)] flex items-center justify-center gap-2 group"
          >
            <MessageCircle size={18} />
            Join WhatsApp Group
          </a>
        </div>
      </div>
    </div>
  );
}
