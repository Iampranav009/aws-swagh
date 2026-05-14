import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { X, Gift, Star, Crown, Zap, Award, Sparkles, Trophy } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Reward {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  imageSrc?: string;
}

interface MilestoneNotification {
  id: string;
  trigger: 'points' | 'tier' | 'referral' | 'rank';
  threshold: number;
  reward: Reward;
  label: string;
}

interface GiftNotificationProps {
  points: number;
  referrals: number;
  tier: string;
  rank: number;
}

// ── Rarity configs ───────────────────────────────────────────────────────────
const rarityConfig = {
  common:    { colors: ['#9CA3AF', '#6B7280'], glow: 'rgba(156,163,175,0.4)',   label: 'Common',    bg: 'from-gray-500/20 to-gray-600/10'   },
  rare:      { colors: ['#60A5FA', '#3B82F6'], glow: 'rgba(96,165,250,0.5)',    label: 'Rare',      bg: 'from-blue-500/20 to-blue-600/10'   },
  epic:      { colors: ['#A78BFA', '#7C3AED'], glow: 'rgba(167,139,250,0.6)',   label: 'Epic',      bg: 'from-violet-500/20 to-purple-600/10' },
  legendary: { colors: ['#FBBF24', '#F59E0B'], glow: 'rgba(251,191,36,0.7)',    label: 'Legendary', bg: 'from-yellow-400/20 to-amber-600/10' },
};

// ── Milestones definition ────────────────────────────────────────────────────
const MILESTONES: MilestoneNotification[] = [
  {
    id: 'first-points',
    trigger: 'points',
    threshold: 10,
    label: 'First 10 Points',
    reward: {
      id: 'starter-badge',
      title: '🌱 Starter Badge',
      description: 'You\'ve taken your first steps in the AWS Builder community! Keep the momentum going.',
      rarity: 'common',
      icon: <Star size={32} className="text-gray-300" />,
    },
  },
  {
    id: 'silver-tier',
    trigger: 'points',
    threshold: 75,
    label: 'Silver Tier Unlocked',
    reward: {
      id: 'silver-badge',
      title: '🥈 Silver Builder',
      description: 'You\'ve crossed 75 points and earned the Silver Tier! Share more referrals to reach Gold.',
      rarity: 'rare',
      icon: <Award size={32} className="text-blue-400" />,
    },
  },
  {
    id: 'gold-tier',
    trigger: 'points',
    threshold: 150,
    label: 'Gold Tier Unlocked',
    reward: {
      id: 'gold-badge',
      title: '🥇 Gold Builder',
      description: 'Incredible! You\'ve hit 150 points and unlocked Gold Tier. You are among our top builders!',
      rarity: 'legendary',
      icon: <Crown size={32} className="text-yellow-400" />,
    },
  },
  {
    id: 'first-referral',
    trigger: 'referral',
    threshold: 1,
    label: 'First Referral!',
    reward: {
      id: 'connector-badge',
      title: '🔗 Community Connector',
      description: 'You referred your first builder! Every great network starts with one connection.',
      rarity: 'rare',
      icon: <Zap size={32} className="text-blue-400" />,
    },
  },
  {
    id: 'five-referrals',
    trigger: 'referral',
    threshold: 5,
    label: '5 Referrals Milestone',
    reward: {
      id: 'influencer-badge',
      title: '⚡ Builder Influencer',
      description: 'Five referrals! You\'re spreading the AWS Builder spirit like wildfire.',
      rarity: 'epic',
      icon: <Trophy size={32} className="text-violet-400" />,
    },
  },
  {
    id: 'top10-rank',
    trigger: 'rank',
    threshold: 10,
    label: 'Top 10 on Leaderboard',
    reward: {
      id: 'top10-badge',
      title: '🏆 Top 10 Builder',
      description: 'You\'ve cracked the Top 10 on the leaderboard! The community sees your dedication.',
      rarity: 'epic',
      icon: <Sparkles size={32} className="text-violet-400" />,
    },
  },
];

// ── Confetti particle ─────────────────────────────────────────────────────────
const ConfettiParticle: React.FC<{ color: string; delay: number; x: number }> = ({ color, delay, x }) => (
  <motion.div
    className="absolute top-0 rounded-full pointer-events-none"
    style={{
      left: `${x}%`,
      width: Math.random() * 8 + 4,
      height: Math.random() * 8 + 4,
      backgroundColor: color,
    }}
    initial={{ y: -20, opacity: 1, rotate: 0 }}
    animate={{
      y: 500,
      opacity: [1, 1, 0],
      rotate: Math.random() * 720 - 360,
      x: Math.random() * 100 - 50,
    }}
    transition={{ duration: 2 + Math.random(), delay, ease: 'easeIn' }}
  />
);

// ── Gift Box ──────────────────────────────────────────────────────────────────
const GiftBox: React.FC<{ onOpen: () => void; rarity: keyof typeof rarityConfig }> = ({ onOpen, rarity }) => {
  const cfg = rarityConfig[rarity];
  const controls = useAnimation();
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const shake = async () => {
      setShaking(true);
      await controls.start({
        x: [0, -8, 8, -6, 6, -4, 4, 0],
        transition: { duration: 0.6 },
      });
      setShaking(false);
    };
    const interval = setInterval(shake, 2000);
    shake();
    return () => clearInterval(interval);
  }, [controls]);

  return (
    <motion.div
      className="flex flex-col items-center gap-4 cursor-pointer select-none"
      onClick={onOpen}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow ring */}
      <div
        className="relative"
        style={{ filter: `drop-shadow(0 0 24px ${cfg.glow})` }}
      >
        <motion.div animate={controls} className="relative w-36 h-36 sm:w-44 sm:h-44">
          {/* Box body */}
          <div
            className="absolute bottom-0 left-0 right-0 h-3/5 rounded-b-2xl"
            style={{ background: `linear-gradient(135deg, ${cfg.colors[0]}, ${cfg.colors[1]})` }}
          >
            {/* Ribbon vertical */}
            <div className="absolute left-1/2 top-0 bottom-0 w-6 -translate-x-1/2 bg-white/20 rounded-sm" />
          </div>
          {/* Lid */}
          <div
            className="absolute top-0 left-0 right-0 h-2/5 rounded-t-2xl rounded-b-none border-b-4 border-white/20"
            style={{ background: `linear-gradient(135deg, ${cfg.colors[0]}cc, ${cfg.colors[1]}cc)` }}
          >
            {/* Ribbon horizontal */}
            <div className="absolute top-1/2 left-0 right-0 h-6 -translate-y-1/2 bg-white/20 rounded-sm" />
          </div>
          {/* Bow */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-1">
            <div
              className="w-7 h-5 rounded-full opacity-90"
              style={{ background: cfg.colors[0], transform: 'skewX(-20deg)' }}
            />
            <div
              className="w-7 h-5 rounded-full opacity-90"
              style={{ background: cfg.colors[1], transform: 'skewX(20deg)' }}
            />
          </div>
          {/* Sparkle dots */}
          {shaking && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    background: cfg.colors[0],
                    top: `${20 + Math.random() * 60}%`,
                    left: `${10 + Math.random() * 80}%`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                />
              ))}
            </>
          )}
        </motion.div>
      </div>

      <motion.div
        className="text-center"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <p className="text-white font-semibold text-base">Tap to reveal!</p>
        <p className="text-white/40 text-xs mt-0.5">You've unlocked a surprise 🎉</p>
      </motion.div>
    </motion.div>
  );
};

// ── Reward Reveal ─────────────────────────────────────────────────────────────
const RewardReveal: React.FC<{ reward: Reward; onClose: () => void }> = ({ reward, onClose }) => {
  const cfg = rarityConfig[reward.rarity];
  const confettiColors = ['#7C3AED', '#00CFFF', '#FBBF24', '#F472B6', '#34D399', '#F87171'];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    color: confettiColors[i % confettiColors.length],
    delay: i * 0.04,
    x: Math.random() * 100,
  }));

  return (
    <div className="flex flex-col items-center gap-6 relative">
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <ConfettiParticle key={i} {...p} />
        ))}
      </div>

      {/* Rarity badge */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border`}
        style={{
          background: `linear-gradient(90deg, ${cfg.colors[0]}30, ${cfg.colors[1]}20)`,
          borderColor: cfg.colors[0] + '60',
          color: cfg.colors[0],
        }}
      >
        {cfg.label} Reward
      </motion.div>

      {/* Icon glow */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className={`w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br ${cfg.bg} border`}
        style={{
          borderColor: cfg.colors[0] + '40',
          boxShadow: `0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow}40`,
        }}
      >
        {reward.icon}
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{reward.title}</h3>
        <p className="text-white/60 text-sm mt-3 leading-relaxed max-w-xs">{reward.description}</p>
      </motion.div>

      {/* Close button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onClose}
        className="mt-2 px-8 py-3 rounded-2xl font-semibold text-sm transition-all"
        style={{
          background: `linear-gradient(135deg, ${cfg.colors[0]}, ${cfg.colors[1]})`,
          boxShadow: `0 8px 24px ${cfg.glow}`,
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        Awesome! 🎉
      </motion.button>
    </div>
  );
};

// ── Notification Bell Item ────────────────────────────────────────────────────
const NotificationItem: React.FC<{
  notification: MilestoneNotification;
  onOpen: () => void;
  isNew: boolean;
}> = ({ notification, onOpen, isNew }) => {
  const cfg = rarityConfig[notification.reward.rarity];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group border border-white/5 hover:border-white/10 bg-black/20"
      onClick={onOpen}
      whileHover={{ scale: 1.01, x: 4 }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `linear-gradient(135deg, ${cfg.colors[0]}30, ${cfg.colors[1]}20)`,
          boxShadow: `0 0 12px ${cfg.glow}`,
        }}
      >
        <Gift size={18} style={{ color: cfg.colors[0] }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{notification.label}</p>
        <p className="text-white/40 text-[10px] mt-0.5">Tap to reveal your reward</p>
      </div>

      {/* New badge */}
      {isNew && (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-[#00CFFF] shrink-0"
        />
      )}
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const GiftNotifications: React.FC<GiftNotificationProps> = ({ points, referrals, tier, rank }) => {
  const [unlockedMilestones, setUnlockedMilestones] = useState<MilestoneNotification[]>([]);
  const [seenMilestones, setSeenMilestones] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('aws_seen_milestones');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });
  const [newMilestones, setNewMilestones] = useState<Set<string>>(new Set());
  const [activeModal, setActiveModal] = useState<MilestoneNotification | null>(null);
  const [modalPhase, setModalPhase] = useState<'gift' | 'reveal'>('gift');
  const [showPanel, setShowPanel] = useState(false);
  const prevMilestoneIds = useRef<Set<string>>(new Set());

  // Check milestones whenever stats change
  useEffect(() => {
    const unlocked = MILESTONES.filter(m => {
      if (m.trigger === 'points')   return points >= m.threshold;
      if (m.trigger === 'referral') return referrals >= m.threshold;
      if (m.trigger === 'rank')     return rank > 0 && rank <= m.threshold;
      if (m.trigger === 'tier')     return tier === 'Gold' && m.threshold === 150;
      return false;
    });

    setUnlockedMilestones(unlocked);

    // Detect newly unlocked (not in previous set)
    const fresh = new Set<string>();
    unlocked.forEach(m => {
      if (!prevMilestoneIds.current.has(m.id) && !seenMilestones.has(m.id)) {
        fresh.add(m.id);
      }
    });

    if (fresh.size > 0) {
      setNewMilestones(prev => new Set([...prev, ...fresh]));
      setShowPanel(true);
    }

    prevMilestoneIds.current = new Set(unlocked.map(m => m.id));
  }, [points, referrals, rank, tier, seenMilestones]);

  const handleOpenNotification = (milestone: MilestoneNotification) => {
    setActiveModal(milestone);
    setModalPhase('gift');
    setShowPanel(false);
  };

  const handleOpenGift = () => {
    setModalPhase('reveal');
  };

  const handleCloseModal = () => {
    if (activeModal) {
      const updated = new Set([...seenMilestones, activeModal.id]);
      setSeenMilestones(updated);
      setNewMilestones(prev => { const n = new Set(prev); n.delete(activeModal.id); return n; });
      localStorage.setItem('aws_seen_milestones', JSON.stringify([...updated]));
    }
    setActiveModal(null);
  };

  const unseenCount = unlockedMilestones.filter(m => !seenMilestones.has(m.id)).length;

  if (unlockedMilestones.length === 0) return null;

  return (
    <>
      {/* ── Floating Bell Button ─────────────────────────────────────────── */}
      <div className="relative">
        <motion.button
          onClick={() => setShowPanel(p => !p)}
          className="relative flex items-center gap-2 px-4 py-2 liquid-glass border border-white/10 rounded-xl text-white/70 hover:text-white hover:border-[#7C3AED]/50 transition-all text-sm"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.div
            animate={unseenCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
            transition={{ duration: 0.6, repeat: unseenCount > 0 ? Infinity : 0, repeatDelay: 3 }}
          >
            <Gift size={16} className={unseenCount > 0 ? 'text-[#7C3AED]' : 'text-white/60'} />
          </motion.div>
          <span className="hidden sm:inline">Rewards</span>
          {unseenCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            >
              {unseenCount}
            </motion.span>
          )}
        </motion.button>

        {/* ── Dropdown Panel ────────────────────────────────────────────── */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute right-0 top-full mt-2 w-72 sm:w-80 liquid-glass border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
              style={{ boxShadow: '0 20px 60px rgba(124,58,237,0.2), 0 4px 20px rgba(0,0,0,0.5)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#7C3AED]" />
                  <span className="text-white font-semibold text-sm">Milestone Rewards</span>
                </div>
                <button onClick={() => setShowPanel(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Items */}
              <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {unlockedMilestones.map(m => (
                    <NotificationItem
                      key={m.id}
                      notification={m}
                      onOpen={() => handleOpenNotification(m)}
                      isNew={newMilestones.has(m.id) && !seenMilestones.has(m.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Gift / Reward Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(11,15,26,0.85)', backdropFilter: 'blur(12px)' }}
            onClick={e => e.target === e.currentTarget && handleCloseModal()}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-sm liquid-glass border border-white/10 rounded-3xl p-8 text-center overflow-hidden"
              style={{
                boxShadow: `0 0 80px ${rarityConfig[activeModal.reward.rarity].glow}40, 0 20px 60px rgba(0,0,0,0.6)`,
              }}
            >
              {/* Background glow */}
              <div
                className="absolute inset-0 -z-10 opacity-20 blur-3xl"
                style={{
                  background: `radial-gradient(circle at center, ${rarityConfig[activeModal.reward.rarity].colors[0]}, transparent 70%)`,
                }}
              />

              {/* Close X */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={14} />
              </button>

              <AnimatePresence mode="wait">
                {modalPhase === 'gift' ? (
                  <motion.div
                    key="gift"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-white/60 text-sm mb-2"
                    >
                      🎊 Milestone Unlocked!
                    </motion.div>
                    <p className="text-white font-bold text-lg mb-4">{activeModal.label}</p>
                    <GiftBox onOpen={handleOpenGift} rarity={activeModal.reward.rarity} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <RewardReveal reward={activeModal.reward} onClose={handleCloseModal} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GiftNotifications;
