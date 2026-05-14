import { motion } from 'framer-motion';
import { type Tier } from '../lib/tiers';
import { Lock } from 'lucide-react';

interface BadgeCardProps {
  tier: Tier;
  index: number;
  isPublicView?: boolean;
  userReferrals?: number;
  isActive?: boolean;
}

export default function BadgeCard({ 
  tier, 
  index, 
  isPublicView = true, 
  userReferrals = 0, 
  isActive = false 
}: BadgeCardProps) {
  const unlocked = isPublicView || userReferrals >= tier.minReferrals;
  const remaining = tier.minReferrals - userReferrals;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 200, damping: 22 }}
      whileHover={{ scale: 1.05 }}
      className="relative rounded-2xl overflow-hidden transition-all duration-300 flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(12px)',
        border: isActive && !isPublicView
          ? '1.5px solid rgba(0, 207, 255, 0.7)'
          : unlocked
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* locked overlay */}
      {!unlocked && !isPublicView && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl"
          style={{ background: 'rgba(11,15,26,0.65)', backdropFilter: 'blur(2px)' }}
        >
          <Lock size={20} className="text-white/30 mb-1" />
          <p className="text-white/40 text-[11px] font-medium">
            Unlock at {tier.minReferrals} referrals
          </p>
          <p className="text-white/25 text-[10px] mt-0.5">
            {remaining} more to go
          </p>
        </div>
      )}

      <div className={`flex flex-col items-center gap-4 p-6 ${!unlocked && !isPublicView ? 'opacity-30' : ''} flex-1`}>
        {/* Badge image (Larger, No Glow) */}
        <div className="relative w-full flex justify-center py-4">
          <img
            src={tier.badge}
            alt={tier.name}
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain relative z-10"
          />
        </div>

        <div className="flex flex-col items-center mt-auto w-full gap-3">
          {/* Tier name */}
          <div className="text-center">
            <p className="text-white font-bold text-lg leading-tight">{tier.name}</p>
            {isActive && !isPublicView && (
              <span
                className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                style={{
                  background: 'rgba(0, 207, 255, 0.1)',
                  color: '#00CFFF',
                  border: '1px solid rgba(0, 207, 255, 0.3)',
                }}
              >
                Your Current Tier
              </span>
            )}
          </div>

          {/* Points required */}
          <div className="text-center w-full">
            <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-1">
              Required
            </p>
            <p className="font-bold text-sm text-[#00CFFF]">
              {tier.minReferrals} referrals · {tier.points} pts
            </p>
          </div>

          {/* Reward */}
          <div className="w-full text-center mt-1 pt-3 border-t border-white/10">
            <p className="text-white/50 text-[11px] leading-snug">
              🎁 {tier.reward}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
