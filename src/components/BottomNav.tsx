import { Link, useLocation } from 'react-router-dom';
import { BarChart2, LayoutDashboard, UserCircle2, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';

const SHOW_ON_PATHS = ['/leaderboard', '/dashboard', '/profile', '/notifications', '/rewards', '/reward'];

function useUnseenCount(userAlias: string) {
  const { leaderboard } = useLeaderboard();
  const cleanKey = (s: string) => (s || '').replace(/^@/, '').trim().toUpperCase();
  const myAlias = cleanKey(userAlias);
  const me = leaderboard.find(u => cleanKey(u.alias) === myAlias);
  const points = me?.points || 0;
  const referrals = me?.referrals || 0;
  const rank = leaderboard.findIndex(u => cleanKey(u.alias) === myAlias) + 1;

  const checks = [
    { id: 'first-10',        ok: points    >= 10  },
    { id: 'first-referral',  ok: referrals >= 1   },
    { id: 'silver-tier',     ok: points    >= 75  },
    { id: 'five-referrals',  ok: referrals >= 5   },
    { id: 'top10',           ok: rank > 0 && rank <= 10 },
    { id: 'gold-tier',       ok: points    >= 150 },
  ];

  const seen: Set<string> = (() => {
    try { return new Set(JSON.parse(localStorage.getItem('aws_seen_milestones') || '[]')); }
    catch { return new Set(); }
  })();

  return checks.filter(c => c.ok && !seen.has(c.id)).length;
}

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const userAlias = localStorage.getItem('aws_alias') || '';
  const unseenCount = useUnseenCount(userAlias);

  if (!user) return null;
  if (!SHOW_ON_PATHS.includes(location.pathname)) return null;

  const navItems = [
    { to: '/dashboard',     icon: LayoutDashboard, label: 'Home'    },
    { to: '/leaderboard',   icon: BarChart2,        label: 'Ranks'  },
    { to: '/notifications', icon: Bell,             label: 'Rewards', badge: unseenCount },
    { to: '/profile',       icon: UserCircle2,      label: 'Profile' },
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="mx-3 mb-3 rounded-2xl border border-white/10 shadow-2xl"
        style={{
          background: 'rgba(11, 15, 26, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map(({ to, icon: Icon, label, badge }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex flex-col items-center gap-1.5 flex-1 py-2 rounded-xl transition-all duration-200 ${
                  active ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span className="relative">
                  <Icon
                    size={20}
                    strokeWidth={active ? 2 : 1.5}
                    className={active ? 'text-[#00CFFF] drop-shadow-[0_0_6px_rgba(0,207,255,0.8)]' : 'text-white/40'}
                  />
                  <AnimatePresence>
                    {badge && badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] text-[9px] font-bold text-white flex items-center justify-center"
                      >
                        {badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className={`text-[10px] font-bold tracking-widest uppercase ${active ? 'text-[#00CFFF]' : 'text-white/30'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
