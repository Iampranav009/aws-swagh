import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, UserCircle2, BookOpen, Bell, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../context/AuthContext';

// Must match Notifications.tsx MILESTONES thresholds
function useUnseenCount(userAlias: string) {
  const { leaderboard } = useLeaderboard();
  const cleanKey = (s: string) => (s || '').replace(/^@/, '').trim().toUpperCase();
  const myAlias = cleanKey(userAlias);
  const me = leaderboard.find(u => cleanKey(u.alias) === myAlias);
  const points = me?.points || 0;
  const referrals = me?.referrals || 0;
  const rank = leaderboard.findIndex(u => cleanKey(u.alias) === myAlias) + 1;

  const thresholds = [
    { trigger: 'points',   threshold: 10  },
    { trigger: 'referral', threshold: 1   },
    { trigger: 'points',   threshold: 75  },
    { trigger: 'referral', threshold: 5   },
    { trigger: 'rank',     threshold: 10  },
    { trigger: 'points',   threshold: 150 },
  ] as const;

  const seen: Set<string> = (() => {
    try { return new Set(JSON.parse(localStorage.getItem('aws_seen_milestones') || '[]')); }
    catch { return new Set(); }
  })();

  const ids = ['first-10','first-referral','silver-tier','five-referrals','top10','gold-tier'];
  let count = 0;
  thresholds.forEach((t, i) => {
    const unlocked =
      t.trigger === 'points'   ? points    >= t.threshold :
      t.trigger === 'referral' ? referrals >= t.threshold :
      rank > 0 && rank <= t.threshold;
    if (unlocked && !seen.has(ids[i])) count++;
  });
  return count;
}

export default function Sidebar({ userAlias = '', setUserAlias }: { userAlias?: string; setUserAlias?: (v: string) => void }) {
  const location = useLocation();
  const unseenCount = useUnseenCount(userAlias);
  const { user } = useAuth(); // Import useAuth hook

  const allLinks = [
    { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard',   protected: true },
    { to: '/leaderboard',    icon: Trophy,           label: 'Leaderboard', protected: false },
    { to: '/rewards',        icon: Medal,            label: 'Rewards',     protected: false },
    { to: '/notifications',  icon: Bell,             label: 'Notifications', badge: unseenCount, protected: true },
    { to: '/profile',        icon: UserCircle2,      label: 'Profile',       protected: true },
  ];

  const links = allLinks.filter(l => !l.protected || user);

  return (
    <aside className="w-60 border-r border-white/5 hidden md:flex flex-col h-full self-start overflow-y-auto bg-black/20 backdrop-blur-xl z-10 shrink-0">
      <div className="p-5 flex flex-col gap-1.5 flex-1">
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2 ml-2 mt-4">Menu</div>

        {links.map(({ to, icon: Icon, label, badge }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                active
                  ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(0,207,255,0.05)]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="relative">
                <Icon size={17} className={active ? 'text-[#00CFFF]' : ''} />
                <AnimatePresence>
                  {badge && badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] text-[9px] font-bold text-white flex items-center justify-center leading-none"
                    >
                      {badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              {label}
            </Link>
          );
        })}

        <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm">
          <BookOpen size={17} /> Rules &amp; FAQ
        </a>
      </div>

      {/* Alias badge at bottom */}
      {userAlias && setUserAlias && (
        <div className="p-5 border-t border-white/5">
          <div
            className="flex items-center gap-3 p-3 liquid-glass rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => { localStorage.removeItem('aws_alias'); setUserAlias(''); }}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#4F46E5] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {userAlias.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-medium truncate">@{userAlias}</p>
              <p className="text-red-400/70 text-[10px] hover:text-red-400 transition-colors">Unlink alias</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
