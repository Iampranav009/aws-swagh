import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TIERS } from '../lib/tiers';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/* ─── Individual card ─────────────────────────────────────────────────────── */
function TierCard({ tier, index }: { tier: typeof TIERS[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group relative rounded-2xl overflow-hidden flex flex-col items-center gap-4 p-6 cursor-default"
      style={{
        background: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(14px)',
        border: `1px solid ${tier.color}25`,
        boxShadow: `0 0 0 0 ${tier.color}00`,
        transition: 'box-shadow 0.3s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${tier.color}25, 0 8px 32px rgba(0,0,0,0.4)`;
        (e.currentTarget as HTMLElement).style.borderColor = `${tier.color}55`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 transparent';
        (e.currentTarget as HTMLElement).style.borderColor = `${tier.color}25`;
      }}
    >
      {/* Top colour strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)` }}
      />

      {/* Radial glow behind badge */}
      <div
        className="absolute top-0 left-0 right-0 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${tier.color}18 0%, transparent 70%)` }}
      />

      {/* Badge image */}
      <div className="relative z-10 mt-2">
        <div
          className="absolute inset-0 rounded-full blur-2xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `${tier.color}30` }}
        />
        <img
          src={tier.badge}
          alt={tier.name}
          className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      {/* Tier name */}
      <div className="relative z-10 text-center">
        <h3 className="text-xl font-bold text-white tracking-tight">{tier.name}</h3>
        <p
          className="text-[11px] font-bold uppercase tracking-widest mt-0.5"
          style={{ color: tier.color }}
        >
          {tier.minReferrals === 0 ? 'Starting tier' : `${tier.minReferrals}+ referrals`}
        </p>
      </div>

      {/* Points pill */}
      <div
        className="relative z-10 px-3 py-1 rounded-full text-[11px] font-bold"
        style={{
          background: `${tier.color}15`,
          border: `1px solid ${tier.color}35`,
          color: tier.color,
        }}
      >
        {tier.points === 0 ? 'Free to join' : `${tier.points} pts`}
      </div>

      {/* Reward text */}
      <p className="relative z-10 text-white/50 text-[12px] text-center leading-snug px-1">
        🎁 {tier.reward}
      </p>
    </motion.div>
  );
}

/* ─── Section ─────────────────────────────────────────────────────────────── */
export default function BadgesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="relative py-20 sm:py-28 overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#7C3AED] rounded-full blur-[160px] opacity-[0.08] pointer-events-none" />
      <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-[#EC4899] rounded-full blur-[120px] opacity-[0.06] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#A78BFA' }}>
            Referral Milestones
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            Earn Badges. Unlock Rewards.
          </h2>
          <p className="text-white/40 text-base max-w-lg mx-auto">
            Every referral brings you closer to exclusive AWS swag and recognition.
          </p>
        </motion.div>

        {/* Badge grid — 5 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {TIERS.map((tier, i) => (
            <TierCard key={tier.id} tier={tier} index={i} />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex justify-center"
        >
          <Link
            to="/auth"
            className="group flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
              boxShadow: '0 0 20px rgba(124,58,237,0.4)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 35px rgba(124,58,237,0.7)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(124,58,237,0.4)'; }}
          >
            Start Earning Now
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
