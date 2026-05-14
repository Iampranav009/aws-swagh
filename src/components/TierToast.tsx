import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkTierUnlock, setNotifiedTier, type Tier } from '../lib/tiers';

interface TierToastProps {
  referrals: number;
}

export default function TierToast({ referrals }: TierToastProps) {
  const [visible, setVisible] = useState(false);
  const [tier, setTier]       = useState<Tier | null>(null);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unlocked = checkTierUnlock(referrals);
    if (unlocked) {
      setNotifiedTier(unlocked.id);
      setTier(unlocked);
      setVisible(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 4000);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [referrals]);

  return (
    <AnimatePresence>
      {visible && tier && (
        <motion.div
          key={tier.id}
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y:   0, scale: 1   }}
          exit   ={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="fixed top-20 right-4 z-[200] w-[280px] sm:w-[320px]"
        >
          <div
            className="relative rounded-2xl border overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(11,15,26,0.95)',
              backdropFilter: 'blur(20px)',
              borderColor: `${tier.color}40`,
              boxShadow: `0 0 30px ${tier.color}30`,
            }}
          >
            {/* top glow strip */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)` }}
            />

            <div className="flex items-start gap-3 p-4">
              <img
                src={tier.badge}
                alt={tier.name}
                className="w-12 h-12 object-contain shrink-0 drop-shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                  🎉 Tier Unlocked
                </p>
                <p className="text-white font-bold text-base leading-tight truncate">
                  {tier.name} Tier
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: tier.color }}>
                  🎁 {tier.reward}
                </p>
              </div>

              {/* close */}
              <button
                onClick={() => setVisible(false)}
                className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none mt-0.5 shrink-0"
              >
                ×
              </button>
            </div>

            {/* auto-dismiss progress bar */}
            <div className="h-[2px] w-full bg-white/5">
              <motion.div
                className="h-full"
                style={{ background: tier.color }}
                initial={{ width: '100%' }}
                animate={{ width:   '0%' }}
                transition={{ duration: 4, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
