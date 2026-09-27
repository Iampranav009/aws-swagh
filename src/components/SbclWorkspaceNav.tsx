import { LayoutDashboard, Network, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function SbclWorkspaceNav({ sbclCode }: { sbclCode: string }) {
  const location = useLocation();
  const items = [
    { to: `/sbcl/${sbclCode}`, label: 'Dashboard', icon: LayoutDashboard },
    { to: `/sbcl/${sbclCode}/network`, label: 'Referral Network', icon: Network },
    { to: `/sbcl/${sbclCode}/profile`, label: 'Profile & form', icon: UserRound },
  ];
  return (
    <nav className="inline-flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-black/20 p-1.5 mb-7">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all ${
            location.pathname === to
              ? 'bg-white/10 text-white font-medium shadow-sm'
              : 'text-white/45 hover:text-white hover:bg-white/5'
          }`}
        >
          <Icon size={15} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
