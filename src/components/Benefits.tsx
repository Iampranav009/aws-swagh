import { Cloud, Code, Users, TrendingUp } from 'lucide-react';

export default function Benefits() {
  const benefits = [
    { icon: Cloud, title: "Learn AWS", desc: "Master cloud technologies and build a strong foundation for your future." },
    { icon: Code, title: "Build Projects", desc: "Get hands-on experience building real-world applications in the cloud." },
    { icon: Users, title: "Networking", desc: "Connect with fellow student builders and industry professionals globally." },
    { icon: TrendingUp, title: "Career Growth", desc: "Prepare for AWS certifications and boost your professional resume." },
  ];

  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">Why Join Us?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, idx) => (
            <div key={idx} className="liquid-glass p-8 rounded-3xl border border-white/5 hover:border-[#7C3AED]/50 transition-all hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(124,58,237,0.15)] group relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#00CFFF]/10 blur-3xl rounded-full group-hover:bg-[#00CFFF]/20 transition-colors" />
              
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:border-[#00CFFF]/30 transition-colors">
                <b.icon className="text-[#00CFFF] group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(0,207,255,0.5)]" size={28} />
              </div>
              <h3 className="text-xl text-white font-semibold mb-3">{b.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
