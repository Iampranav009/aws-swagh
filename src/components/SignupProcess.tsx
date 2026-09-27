import { ExternalLink, UserPlus, User, QrCode, Copy, FileText } from 'lucide-react';

export default function SignupProcess() {
  const steps = [
    { 
      icon: ExternalLink, 
      title: "Open Link", 
      desc: "Visit the registration portal.", 
    },
    { 
      icon: UserPlus, 
      title: "Sign In", 
      desc: "Create or login to account.",
    },
    { 
      icon: User, 
      title: "Profile", 
      desc: "Tap your icon (top right).",
    },
    { 
      icon: QrCode, 
      title: "QR Code", 
      desc: "Go to the QR Code section.",
    },
    { 
      icon: Copy, 
      title: "Copy Alias", 
      desc: "Copy your @username.",
    },
    { 
      icon: FileText, 
      title: "Submit Form", 
      desc: "Submit your alias in the registration form.", 
    },
  ];

  return (
    <section className="py-24 px-6 relative overflow-hidden bg-black/20">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-64 bg-[#00CFFF] blur-[120px] rounded-full opacity-5 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-white/40 max-w-2xl mx-auto">Follow these 6 simple steps to register and start earning rewards.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
          {/* Connector line for desktop */}
          <div className="hidden lg:block absolute top-[48px] left-[8%] right-[8%] h-[1px] bg-white/10 z-0" />
          
          {steps.map((step, idx) => (
            <div key={idx} className="liquid-glass p-5 rounded-3xl flex flex-col items-center text-center relative z-10 border border-white/5 hover:border-[#00CFFF]/30 transition-all hover:-translate-y-1 group">
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white/40 text-xs font-bold">
                0{idx + 1}
              </div>
              
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#4F46E5]/20 flex items-center justify-center mb-5 border border-white/10 group-hover:border-[#00CFFF]/40 transition-all shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                <step.icon className="text-[#00CFFF]" size={20} />
              </div>
              
              <h3 className="text-white font-bold text-sm mb-2">{step.title}</h3>
              <p className="text-white/40 text-[11px] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
