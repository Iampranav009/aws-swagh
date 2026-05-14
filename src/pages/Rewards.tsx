import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { TIERS, getTierForReferrals, getNextTier } from '../lib/tiers';
import BadgeCard from '../components/BadgeCard';
import Sidebar from '../components/Sidebar';
import TierToast from '../components/TierToast';
import SwagSection from '../components/SwagSection';
import SignupProcess from '../components/SignupProcess';
import { motion } from 'framer-motion';
import { Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Rewards() {
  const { user } = useAuth();
  const { leaderboard, loading } = useLeaderboard();
  const [userAlias, setUserAlias] = useState(localStorage.getItem('aws_alias') || '');

  const cleanKey = (s: string) => (s || '').replace(/^@/, '').trim().toUpperCase();
  const myAlias = cleanKey(userAlias);

  const me = leaderboard.find(u => cleanKey(u.alias) === myAlias);
  const referrals = me?.referrals ?? 0;
  const currentTier = getTierForReferrals(referrals);
  const nextTier = getNextTier(currentTier);

  const progressPct = nextTier
    ? Math.min((referrals / nextTier.minReferrals) * 100, 100)
    : 100;

  // Render Logged-in View
  return (
    <div className="bg-[#0B0F1A] h-screen pt-[72px] relative overflow-hidden flex flex-col">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row flex-1 overflow-hidden w-full">
        <TierToast referrals={referrals} />
        <Sidebar userAlias={userAlias} setUserAlias={setUserAlias} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Swag Pack Section at the top */}
          <div className="mb-10">
            <SwagSection />
          </div>

        <div className="p-4 sm:p-6 lg:p-8 w-full pb-28 md:pb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10"
          >
            <div>
              <p className="text-[#00CFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                {user ? 'Your Progress' : 'Exclusive Rewards'}
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                It's AWS <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]">Giveaway Time</span>
              </h1>
              <p className="text-white/40 text-sm sm:text-base mt-2 max-w-md leading-relaxed">
                Earn referrals → unlock tiers → claim exclusive rewards.
              </p>
            </div>
            
            <Link
              to={user ? "/profile" : "/auth?signup=true"}
              className="liquid-glass bg-white/5 border border-white/10 text-white font-semibold text-sm px-8 py-3 rounded-full hover:bg-white/10 hover:border-[#7C3AED]/50 transition-all flex items-center gap-2 group"
            >
              <Zap size={16} className="text-[#7C3AED]" />
              {user ? 'Refer Now' : 'Join Now'}
            </Link>
          </motion.div>

          {/* Current Tier & Progress - Only if logged in, otherwise show Join Card */}
          {user ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="relative rounded-2xl border overflow-hidden mb-12"
              style={{
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(0, 207, 255, 0.4)',
                boxShadow: '0 0 40px rgba(0, 207, 255, 0.1)',
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, #00CFFF, transparent)' }}
              />
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative shrink-0">
                  <div
                    className="absolute inset-0 rounded-full blur-3xl"
                    style={{ background: 'rgba(0, 207, 255, 0.2)' }}
                  />
                  <img
                    src={currentTier.badge}
                    alt={currentTier.name}
                    className="w-20 h-20 object-contain relative z-10"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Trophy size={14} className="text-[#00CFFF]" />
                    <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/40">
                      Your Current Tier
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tight">{currentTier.name}</p>
                  <p className="text-sm mt-0.5 text-[#00CFFF]">
                    {referrals} referrals · {referrals * 15} points
                  </p>

                  {nextTier && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white/30 text-[9px] uppercase tracking-wider font-semibold">
                          Next: {nextTier.name}
                        </span>
                        <span className="text-white/30 text-[9px] font-semibold">
                          {referrals}/{nextTier.minReferrals}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #00CFFF, #7C3AED)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  )}

                  {!nextTier && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <Zap size={12} className="text-[#00CFFF]" />
                      <span className="text-[11px] font-bold text-[#00CFFF]">
                        Max tier reached — you're a Legend! 🎉
                      </span>
                    </div>
                  )}
                </div>

                <div
                  className="shrink-0 px-5 py-3 rounded-xl border text-center"
                  style={{
                    background: 'rgba(0, 207, 255, 0.05)',
                    borderColor: 'rgba(0, 207, 255, 0.2)',
                  }}
                >
                  <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mb-1">Reward</p>
                  <p className="text-sm font-semibold text-[#00CFFF]">
                    🎁 {currentTier.reward}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="relative rounded-2xl border border-white/10 overflow-hidden mb-12 p-8 text-center"
              style={{
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Trophy size={32} className="mx-auto text-[#7C3AED] mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Track Your Progress</h2>
              <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">
                Sign up to start referring friends and unlocking milestone rewards!
              </p>
              <Link
                to="/auth?signup=true"
                className="liquid-glass inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white font-semibold text-sm px-8 py-3 rounded-full hover:bg-white/10 hover:border-[#7C3AED]/50 transition-all"
              >
                <Zap size={16} className="text-[#7C3AED]" />
                Get Started
              </Link>
            </motion.div>
          )}

          <div className="mb-16">
            <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold mb-6">
              All Milestone Tiers
            </p>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TIERS.map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
                {TIERS.map((tier, i) => (
                  <BadgeCard
                    key={tier.id}
                    tier={tier}
                    index={i}
                    isPublicView={false}
                    userReferrals={referrals}
                    isActive={tier.id === currentTier.id}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-16">
            <SignupProcess />
          </div>
        </div>
      </main>
    </div>
  </div>
  );
}
