import { Link, useLocation } from 'react-router-dom';
import { BarChart2, LayoutDashboard, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Pages where bottom nav should appear (not on landing page /home)
const SHOW_ON_PATHS = ['/leaderboard', '/dashboard', '/profile'];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;
  if (!SHOW_ON_PATHS.includes(location.pathname)) return null;

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/leaderboard', icon: BarChart2, label: 'Ranks' },
    { to: '/profile', icon: UserCircle2, label: 'Profile' },
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
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1.5 flex-1 py-2 rounded-xl transition-all duration-200 ${
                  active ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2 : 1.5}
                  className={
                    active
                      ? 'text-[#00CFFF] drop-shadow-[0_0_6px_rgba(0,207,255,0.8)]'
                      : 'text-white/40'
                  }
                />
                <span
                  className={`text-[10px] font-bold tracking-widest uppercase ${
                    active ? 'text-[#00CFFF]' : 'text-white/30'
                  }`}
                >
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
