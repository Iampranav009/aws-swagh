import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, Gift, Zap, Award, Package } from 'lucide-react';

const GOODIES = [
  {
    rank: '🥇 #1',
    title: 'AWS Hero Bundle',
    description: 'Premium AWS branded backpack, hoodie, t-shirt, notebook, and exclusive limited-edition swag.',
    items: ['AWS Backpack', 'Premium Hoodie', 'Limited T-Shirt', 'Notebook + Stickers'],
    glow: 'rgba(255,215,0,0.25)',
    border: 'border-yellow-500/40',
    badgeColor: 'from-yellow-400 to-yellow-600',
    iconColor: 'text-yellow-400',
    icon: <Trophy size={28} />,
  },
  {
    rank: '🥈 #2',
    title: 'Cloud Builder Kit',
    description: 'AWS branded merchandise pack with exclusive community goodies hand-picked for cloud builders.',
    items: ['AWS T-Shirt', 'Cap + Hoodie', 'Sticker Pack', 'AWS Powerbank'],
    glow: 'rgba(192,192,192,0.2)',
    border: 'border-slate-400/40',
    badgeColor: 'from-slate-300 to-slate-500',
    iconColor: 'text-slate-300',
    icon: <Award size={28} />,
  },
  {
    rank: '🥉 #3',
    title: 'Starter Swag Pack',
    description: 'Kickstart your AWS journey with an exclusive swag kit designed for the ambitious builders.',
    items: ['AWS T-Shirt', 'Sticker Collection', 'Branded Notebook', 'Pin Badge'],
    glow: 'rgba(205,127,50,0.2)',
    border: 'border-orange-500/40',
    badgeColor: 'from-orange-400 to-orange-600',
    iconColor: 'text-orange-400',
    icon: <Package size={28} />,
  },
  {
    rank: '🎖️ Top 10',
    title: 'Community Goodie Bag',
    description: 'Everyone in the top 10 takes home exclusive AWS community swag and surprise goodies.',
    items: ['AWS Stickers', 'Community Badge', 'Surprise Goodies', 'Certificate'],
    glow: 'rgba(0,207,255,0.15)',
    border: 'border-[#00CFFF]/30',
    badgeColor: 'from-[#00CFFF] to-[#7C3AED]',
    iconColor: 'text-[#00CFFF]',
    icon: <Gift size={28} />,
  },
];

const STATS = [
  { label: 'Goodies Up for Grabs', value: '50+', icon: <Gift size={18} /> },
  { label: 'Active Participants', value: '200+', icon: <Zap size={18} /> },
  { label: 'Referral Points Earned', value: '5K+', icon: <Star size={18} /> },
];

export default function GoodiesSection() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="goodies"
      ref={sectionRef}
      className="relative py-28 px-6 bg-[#0B0F1A] overflow-hidden"
    >
      {/* Background glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF9900]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00CFFF]/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Heading */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="inline-flex items-center gap-2 liquid-glass rounded-full px-5 py-2 mb-6">
            <Gift size={15} className="text-[#FF9900]" />
            <span className="text-[#FF9900] text-xs font-semibold tracking-widest uppercase">Exclusive Giveaway</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight">
            Refer & Win{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9900] to-[#00CFFF]">
              AWS Goodies
            </span>
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
            Every referral earns you points. The more you share, the higher you climb — and the better the prize waiting at the top. This is your shot to win exclusive, limited-edition AWS swag.
          </p>
        </div>

        {/* Stats strip */}
        <div
          className={`grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-16 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {STATS.map(({ label, value, icon }) => (
            <div key={label} className="liquid-glass rounded-2xl p-4 text-center">
              <div className="flex justify-center mb-2 text-[#FF9900]">{icon}</div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-white/50 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Goodies cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {GOODIES.map(({ rank, title, description, items, glow, border, badgeColor, iconColor, icon }, i) => (
            <div
              key={title}
              className={`relative liquid-glass rounded-3xl p-6 border ${border} flex flex-col gap-4 transition-all duration-700 hover:-translate-y-2 hover:scale-[1.02] group`}
              style={{
                transitionDelay: `${i * 100 + 200}ms`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(32px)',
                boxShadow: `0 0 40px ${glow}`,
              }}
            >
              {/* Rank badge */}
              <div className={`self-start px-3 py-1 rounded-full text-xs font-bold text-black bg-gradient-to-r ${badgeColor}`}>
                {rank}
              </div>

              <div className={`${iconColor} group-hover:scale-110 transition-transform duration-300`}>
                {icon}
              </div>

              <div>
                <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{description}</p>
              </div>

              <ul className="space-y-1.5 mt-auto">
                {items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-white/70 text-sm">
                    <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${badgeColor} flex-shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`text-center transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <p className="text-white/50 text-sm mb-6 uppercase tracking-widest">Ready to claim your spot?</p>
          <Link
            to="/auth?signup=true"
            className="inline-flex items-center gap-3 bg-[#FF9900] text-black font-bold text-base px-10 py-4 rounded-full hover:bg-[#FFB347] hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,153,0,0.5)]"
          >
            <Trophy size={20} />
            Join the Referral Programme
          </Link>
          <p className="text-white/30 text-xs mt-4">
            Free to join · Earn points per referral · Winner announced June 15, 2026
          </p>
        </div>
      </div>
    </section>
  );
}
