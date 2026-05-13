import { UserPlus, AtSign, FileText, Share2, Award } from 'lucide-react';

export default function SignupProcess() {
  const steps = [
    { icon: UserPlus, title: "Sign up", desc: "Create your account." },
    { icon: AtSign, title: "Get AWS Alias", desc: "Claim your builder ID." },
    { icon: FileText, title: "Fill Google Form", desc: "Complete registration." },
    { icon: Share2, title: "Enter referral code", desc: "Share with peers." },
    { icon: Award, title: "Earn points", desc: "15 pts per referral." },
  ];

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-64 bg-[#7C3AED] blur-[120px] rounded-full opacity-10 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-[#00CFFF]/50 to-transparent z-0" />
          
          {steps.map((step, idx) => (
            <div key={idx} className="liquid-glass p-6 rounded-3xl flex flex-col items-center text-center relative z-10 border border-white/5 hover:border-[#00CFFF]/40 transition-all hover:-translate-y-2 group">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(124,58,237,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(0,207,255,0.5)] transition-all">
                <step.icon className="text-white" size={24} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
