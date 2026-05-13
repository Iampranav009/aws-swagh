import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, UserCircle2, BookOpen } from 'lucide-react';

export default function Sidebar({ userAlias, setUserAlias }: { userAlias?: string, setUserAlias?: (v: string) => void }) {
  const location = useLocation();

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/profile', icon: UserCircle2, label: 'Profile' },
  ];

  return (
    <aside className="w-60 border-r border-white/5 hidden md:flex flex-col h-[calc(100vh-72px)] sticky top-[72px] self-start overflow-y-auto bg-black/20 backdrop-blur-xl z-10 shrink-0">
      <div className="p-5 flex flex-col gap-1.5 flex-1">
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2 ml-2 mt-4">Menu</div>

        {links.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                active
                  ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(0,207,255,0.05)]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={17} className={active ? 'text-[#00CFFF]' : ''} />
              {label}
            </Link>
          );
        })}

        <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm">
          <BookOpen size={17} /> Rules & FAQ
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
