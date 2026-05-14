import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Gift, Star, Crown, Zap, Award, Sparkles, Trophy, CheckCircle2 } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Reward {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Milestone {
  id: string;
  trigger: 'points' | 'referral' | 'rank';
  threshold: number;
  label: string;
  sublabel: string;
  reward: Reward;
}

// ── Rarity config ─────────────────────────────────────────────────────────────
const RC = {
  common:    { colors: ['#9CA3AF','#6B7280'], glow: 'rgba(156,163,175,0.5)', label: 'Common',    bg: 'from-gray-500/20 to-gray-600/10' },
  rare:      { colors: ['#60A5FA','#3B82F6'], glow: 'rgba(96,165,250,0.5)',  label: 'Rare',      bg: 'from-blue-500/20 to-blue-600/10' },
  epic:      { colors: ['#A78BFA','#7C3AED'], glow: 'rgba(167,139,250,0.6)', label: 'Epic',      bg: 'from-violet-500/20 to-purple-600/10' },
  legendary: { colors: ['#FBBF24','#F59E0B'], glow: 'rgba(251,191,36,0.7)', label: 'Legendary', bg: 'from-yellow-400/20 to-amber-600/10' },
};

// ── All milestones ─────────────────────────────────────────────────────────────
const MILESTONES: Milestone[] = [
  {
    id: 'first-10',
    trigger: 'points', threshold: 10,
    label: 'First 10 Points', sublabel: 'Reach 10 points',
    reward: { id: 'starter', title: '🌱 Starter Badge', description: 'You\'ve taken your first steps in the AWS Builder community!', rarity: 'common', icon: <Star size={28} className="text-gray-300" /> },
  },
  {
    id: 'first-referral',
    trigger: 'referral', threshold: 1,
    label: 'First Referral', sublabel: 'Refer 1 builder',
    reward: { id: 'connector', title: '🔗 Community Connector', description: 'You referred your first builder! Every great network starts with one connection.', rarity: 'rare', icon: <Zap size={28} className="text-blue-400" /> },
  },
  {
    id: 'silver-tier',
    trigger: 'points', threshold: 75,
    label: 'Silver Builder', sublabel: 'Reach 75 points',
    reward: { id: 'silver', title: '🥈 Silver Builder', description: 'You\'ve crossed 75 points and earned the Silver Tier!', rarity: 'rare', icon: <Award size={28} className="text-blue-400" /> },
  },
  {
    id: 'five-referrals',
    trigger: 'referral', threshold: 5,
    label: 'Builder Influencer', sublabel: 'Refer 5 builders',
    reward: { id: 'influencer', title: '⚡ Builder Influencer', description: 'Five referrals! You\'re spreading the AWS Builder spirit like wildfire.', rarity: 'epic', icon: <Trophy size={28} className="text-violet-400" /> },
  },
  {
    id: 'top10',
    trigger: 'rank', threshold: 10,
    label: 'Top 10 Builder', sublabel: 'Enter top 10 ranks',
    reward: { id: 'top10', title: '🏆 Top 10 Builder', description: 'You\'ve cracked the Top 10! The community sees your dedication.', rarity: 'epic', icon: <Sparkles size={28} className="text-violet-400" /> },
  },
  {
    id: 'gold-tier',
    trigger: 'points', threshold: 150,
    label: 'Gold Builder', sublabel: 'Reach 150 points',
    reward: { id: 'gold', title: '🥇 Gold Builder', description: 'Incredible! You\'ve hit 150 points and unlocked Gold Tier!', rarity: 'legendary', icon: <Crown size={28} className="text-yellow-400" /> },
  },
];

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti() {
  const colors = ['#7C3AED','#00CFFF','#FBBF24','#F472B6','#34D399','#F87171'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            width: Math.random() * 8 + 4,
            height: Math.random() * 8 + 4,
            backgroundColor: colors[i % colors.length],
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 500, opacity: [1, 1, 0], rotate: Math.random() * 720 - 360, x: Math.random() * 120 - 60 }}
          transition={{ duration: 2 + Math.random(), delay: i * 0.04, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

// ── Gift Box ──────────────────────────────────────────────────────────────────
function GiftBox({ onOpen, rarity }: { onOpen: () => void; rarity: keyof typeof RC }) {
  const cfg = RC[rarity];
  const controls = useAnimation();

  useEffect(() => {
    const shake = async () => {
      await controls.start({ x: [0,-8,8,-6,6,-4,4,0], transition: { duration: 0.6 } });
    };
    shake();
    const t = setInterval(shake, 2500);
    return () => clearInterval(t);
  }, [controls]);

  return (
    <motion.div className="flex flex-col items-center gap-5 cursor-pointer select-none" onClick={onOpen} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
      <div style={{ filter: `drop-shadow(0 0 30px ${cfg.glow})` }}>
        <motion.div animate={controls} className="relative w-44 h-44 sm:w-52 sm:h-52">
          {/* Body */}
          <div className="absolute bottom-0 left-0 right-0 h-3/5 rounded-b-2xl" style={{ background: `linear-gradient(135deg,${cfg.colors[0]},${cfg.colors[1]})` }}>
            <div className="absolute left-1/2 top-0 bottom-0 w-7 -translate-x-1/2 bg-white/25 rounded-sm" />
          </div>
          {/* Lid */}
          <div className="absolute top-0 left-0 right-0 h-[42%] rounded-t-2xl border-b-4 border-white/20" style={{ background: `linear-gradient(135deg,${cfg.colors[0]}cc,${cfg.colors[1]}cc)` }}>
            <div className="absolute top-1/2 left-0 right-0 h-7 -translate-y-1/2 bg-white/25 rounded-sm" />
          </div>
          {/* Bow */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-8 h-6 rounded-full opacity-90" style={{ background: cfg.colors[0], transform: 'skewX(-20deg)' }} />
            <div className="w-8 h-6 rounded-full opacity-90" style={{ background: cfg.colors[1], transform: 'skewX(20deg)' }} />
          </div>
        </motion.div>
      </div>
      <motion.div className="text-center" animate={{ y: [0,-5,0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
        <p className="text-white font-bold text-lg">Tap to reveal!</p>
        <p className="text-white/40 text-sm mt-1">Your reward is waiting 🎉</p>
      </motion.div>
    </motion.div>
  );
}

// ── Reward Card ───────────────────────────────────────────────────────────────
function RewardReveal({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const cfg = RC[reward.rarity];
  return (
    <div className="flex flex-col items-center gap-5 relative">
      <Confetti />
      <motion.span
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border"
        style={{ background: `${cfg.colors[0]}22`, borderColor: `${cfg.colors[0]}55`, color: cfg.colors[0] }}
      >
        {cfg.label} Reward
      </motion.span>

      <motion.div
        initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className={`w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br ${cfg.bg} border`}
        style={{ borderColor: `${cfg.colors[0]}44`, boxShadow: `0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow}44` }}
      >
        {reward.icon}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
        <h3 className="text-2xl sm:text-3xl font-bold text-white">{reward.title}</h3>
        <p className="text-white/60 text-sm mt-3 leading-relaxed max-w-xs">{reward.description}</p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        onClick={onClose}
        className="mt-2 px-8 py-3 rounded-2xl font-semibold text-sm text-white"
        style={{ background: `linear-gradient(135deg,${cfg.colors[0]},${cfg.colors[1]})`, boxShadow: `0 8px 24px ${cfg.glow}` }}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
      >
        Awesome! 🎉
      </motion.button>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function GiftModal({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  const [phase, setPhase] = useState<'gift' | 'reveal'>('gift');
  const cfg = RC[milestone.reward.rarity];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(11,15,26,0.88)', backdropFilter: 'blur(14px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.85, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="relative w-full max-w-sm liquid-glass border border-white/10 rounded-3xl p-8 text-center overflow-hidden"
        style={{ boxShadow: `0 0 80px ${cfg.glow}44, 0 20px 60px rgba(0,0,0,0.6)` }}
      >
        <div className="absolute inset-0 -z-10 opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle at center,${cfg.colors[0]},transparent 70%)` }} />

        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all text-lg leading-none">
          ×
        </button>

        <AnimatePresence mode="wait">
          {phase === 'gift' ? (
            <motion.div key="gift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex flex-col items-center gap-2">
              <div className="text-white/60 text-sm mb-1">🎊 Milestone Unlocked!</div>
              <p className="text-white font-bold text-xl mb-4">{milestone.label}</p>
              <GiftBox onOpen={() => setPhase('reveal')} rarity={milestone.reward.rarity} />
            </motion.div>
          ) : (
            <motion.div key="reveal" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <RewardReveal reward={milestone.reward} onClose={onClose} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Notifications() {
  useAuth();
  const { leaderboard, loading } = useLeaderboard();

  const userAlias = localStorage.getItem('aws_alias') || '';
  const cleanKey = (s: string) => (s || '').replace(/^@/, '').trim().toUpperCase();
  const myAlias = cleanKey(userAlias);

  const currentUser = leaderboard.find(u => cleanKey(u.alias) === myAlias);
  const rank = leaderboard.findIndex(u => cleanKey(u.alias) === myAlias) + 1;
  const points = currentUser?.points || 0;
  const referrals = currentUser?.referrals || 0;

  const [seen, setSeen] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('aws_seen_milestones') || '[]')); }
    catch { return new Set(); }
  });
  const [activeModal, setActiveModal] = useState<Milestone | null>(null);
  const prevIds = useRef<Set<string>>(new Set());

  const isUnlocked = (m: Milestone) => {
    if (m.trigger === 'points')   return points >= m.threshold;
    if (m.trigger === 'referral') return referrals >= m.threshold;
    if (m.trigger === 'rank')     return rank > 0 && rank <= m.threshold;
    return false;
  };

  const unlocked = MILESTONES.filter(isUnlocked);

  // Auto-pop newest unlock once
  useEffect(() => {
    if (loading) return;
    for (const m of unlocked) {
      if (!prevIds.current.has(m.id) && !seen.has(m.id)) {
        setActiveModal(m);
        break;
      }
    }
    prevIds.current = new Set(unlocked.map(m => m.id));
  }, [points, referrals, rank, loading]);

  const handleClose = () => {
    if (activeModal) {
      const updated = new Set([...seen, activeModal.id]);
      setSeen(updated);
      localStorage.setItem('aws_seen_milestones', JSON.stringify([...updated]));
    }
    setActiveModal(null);
  };

  const handleOpen = (m: Milestone) => {
    setActiveModal(m);
  };

  const unseenCount = unlocked.filter(m => !seen.has(m.id)).length;

  return (
    <div className="bg-[#0B0F1A] h-screen pt-[72px] relative overflow-hidden flex flex-col">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row flex-1 overflow-hidden w-full">
        <Sidebar userAlias={userAlias} setUserAlias={() => {}} />

        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full pb-28 md:pb-10">

          {/* Header */}
          <div className="liquid-glass p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden mb-6 group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#7C3AED] to-[#00CFFF] opacity-15 blur-3xl group-hover:opacity-25 transition-opacity pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-semibold">Milestone Rewards</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00CFFF] to-[#7C3AED]">
                  Your Notifications
                </h1>
                <p className="text-white/40 text-xs sm:text-sm mt-1">Unlock rewards by earning points and referring builders.</p>
              </div>
              {unseenCount > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg,#7C3AED33,#00CFFF22)', border: '1px solid #7C3AED55', color: '#A78BFA' }}
                >
                  <Gift size={16} />
                  {unseenCount} New
                </motion.div>
              )}
            </div>
          </div>

          {/* Stats mini row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Points', value: loading ? '—' : points, color: 'from-[#7C3AED] to-[#00CFFF]' },
              { label: 'Referrals', value: loading ? '—' : referrals, color: '' },
              { label: 'Rank', value: loading ? '—' : rank > 0 ? `#${rank}` : '—', color: '' },
            ].map(s => (
              <div key={s.label} className="liquid-glass p-3 sm:p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-white/40 text-[9px] uppercase tracking-widest mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color ? `text-transparent bg-clip-text bg-gradient-to-r ${s.color}` : 'text-white'}`}>{String(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Milestone cards */}
          {unlocked.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {unlocked.map(m => {
                const isSeen = seen.has(m.id);
                const cfg = RC[m.reward.rarity];

                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="relative liquid-glass rounded-2xl border overflow-hidden transition-all border-white/10 cursor-pointer hover:border-white/20"
                    onClick={() => handleOpen(m)}
                    style={{ boxShadow: `0 0 20px ${cfg.glow}22` }}
                  >
                    {/* Rarity glow stripe */}
                    <div className="absolute top-0 left-0 right-0 h-0.5"
                      style={{ background: `linear-gradient(90deg,transparent,${cfg.colors[0]},transparent)` }} />

                    <div className="p-4 sm:p-5 flex items-center gap-4">
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${cfg.bg} border`}
                        style={{
                          borderColor: `${cfg.colors[0]}44`,
                          boxShadow: `0 0 16px ${cfg.glow}`,
                        }}
                      >
                        {m.reward.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm">{m.label}</p>
                          <span
                            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border"
                            style={{
                              color: cfg.colors[0],
                              borderColor: `${cfg.colors[0]}44`,
                              background: `${cfg.colors[0]}15`,
                            }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-white/40 text-xs mt-0.5">{m.sublabel}</p>
                      </div>

                      {/* Status */}
                      <div className="shrink-0">
                        {isSeen ? (
                          <CheckCircle2 size={18} className="text-green-400/70" />
                        ) : (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                            className="w-3 h-3 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]"
                          />
                        )}
                      </div>
                    </div>

                    {/* Tap to open CTA */}
                    {!isSeen && (
                      <div className="px-5 pb-4">
                        <div
                          className="flex items-center gap-2 text-xs font-medium py-2 px-3 rounded-xl"
                          style={{ background: `${cfg.colors[0]}15`, color: cfg.colors[0] }}
                        >
                          <Gift size={12} />
                          Tap to open your gift!
                        </div>
                      </div>
                    )}
                    {isSeen && (
                      <div className="px-5 pb-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-white/30 py-2 px-3 rounded-xl bg-white/5">
                          <CheckCircle2 size={12} />
                          Reward collected — tap to view again
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="liquid-glass p-8 sm:p-12 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Gift size={24} className="text-white/20" />
              </div>
              <p className="text-white font-semibold text-lg mb-1">No notifications yet</p>
              <p className="text-white/40 text-sm">Keep building to unlock new rewards and milestones.</p>
            </div>
          )}

        </div>
      </main>
    </div>

    {/* Gift modal */}
    <AnimatePresence>
      {activeModal && (
        <GiftModal milestone={activeModal} onClose={handleClose} />
      )}
    </AnimatePresence>
  </div>
  );
}
