import { Activity, Download, LayoutDashboard, MailPlus, Network, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const items = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/invitations', label: 'Invitations', icon: MailPlus },
  { href: '/admin/activity', label: 'SBCL Activity', icon: Activity },
  { href: '/admin/signups', label: 'Signup Records', icon: Users },
  { href: '/admin/network', label: 'Referral Network', icon: Network },
  { href: '/admin/exports', label: 'Exports', icon: Download },
];

export default function AdminSidebar() {
  const location = useLocation();
  return <aside className="w-full lg:w-60 shrink-0"><div className="lg:sticky lg:top-24 liquid-glass border border-white/10 rounded-2xl lg:rounded-3xl p-3 lg:p-4"><p className="hidden lg:block px-3 pt-2 pb-3 text-[10px] text-white/30 uppercase tracking-[.2em]">Admin menu</p><nav className="flex lg:block gap-1 lg:space-y-1 overflow-x-auto scrollbar-hide">{items.map(({ href, label, icon: Icon }) => { const active = location.pathname === href; return <Link key={href} to={href} className={`shrink-0 flex items-center gap-2 lg:gap-3 px-3 py-2.5 lg:py-3 rounded-xl text-xs lg:text-sm transition-colors ${active ? 'bg-orange-400/10 text-white border border-orange-400/15' : 'text-white/50 hover:text-white hover:bg-white/[.06]'}`}><Icon size={16} className="text-orange-400" />{label}</Link>; })}</nav></div></aside>;
}
