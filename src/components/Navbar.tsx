import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LogoBrand from './LogoBrand';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Leaderboard', path: '/leaderboard' },
    { label: 'Rewards', path: user ? '/rewards' : '/reward' },
    ...(user ? [
      { label: 'Dashboard', path: '/dashboard' },
    ] : []),
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-8 py-5 transition-all duration-300 ${!isHome || scrolled ? 'bg-[#0B0F1A]/80 backdrop-blur-md border-b border-white/10' : ''}`}>
        <LogoBrand size="sm" />

        <div className="hidden md:flex liquid-glass items-center gap-1 rounded-xl px-2 py-2">
          {navLinks.map((link, index) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={index}
                to={link.path}
                className={`flex items-center gap-0.5 px-4 py-1.5 rounded-md text-sm transition-all ${
                  active ? 'bg-white/15 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <button onClick={logout} className="liquid-glass text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-white/10 transition-colors">
              Log out
            </button>
          ) : (
            <>
              <Link to="/auth" className="liquid-glass text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-white/10 transition-colors">
                Log in
              </Link>
              <Link to="/auth?signup=true" className="bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white text-sm font-medium px-5 py-2 rounded-full hover:opacity-90 transition-all shadow-[0_0_15px_rgba(124,58,237,0.5)] hover:shadow-[0_0_25px_rgba(124,58,237,0.7)]">
                Begin Now
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden liquid-glass text-white p-2 rounded-lg transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed top-[76px] left-4 right-4 z-40 md:hidden liquid-glass rounded-2xl p-4 flex flex-col gap-2 shadow-2xl border border-white/10 animate-in slide-in-from-top-4">
          {navLinks.map((link, index) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={index}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="flex gap-2 mt-2 pt-4 border-t border-white/10">
            {user ? (
               <button onClick={() => { logout(); setMenuOpen(false); }} className="flex-1 liquid-glass text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-center">
                 Log out
               </button>
            ) : (
              <>
                <Link to="/auth" onClick={() => setMenuOpen(false)} className="flex-1 text-center liquid-glass text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-white/10 transition-colors">
                  Log in
                </Link>
                <Link to="/auth?signup=true" onClick={() => setMenuOpen(false)} className="flex-1 text-center bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white text-sm font-medium px-4 py-3 rounded-xl hover:opacity-90 transition-colors shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                  Begin Now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
