import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { Copy, CheckCircle2, Crown, Medal, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Profile() {
  const { user, logout } = useAuth();
  const { leaderboard } = useLeaderboard();
  const [userAlias, setUserAlias] = useState(localStorage.getItem('aws_alias') || '');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopy = () => {
    navigator.clipboard.writeText(userAlias);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlink = () => {
    localStorage.removeItem('aws_alias');
    setUserAlias('');
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const currentUserData = leaderboard.find(u => u.alias.toUpperCase() === userAlias.toUpperCase());
  const rank = leaderboard.findIndex(u => u.alias.toUpperCase() === userAlias.toUpperCase()) + 1;
  const points = currentUserData?.points || 0;
  const referrals = currentUserData?.referrals || 0;
  const tier = points >= 150 ? 'Gold' : points >= 75 ? 'Silver' : 'Bronze';
  const tierColor = tier === 'Gold' ? 'text-yellow-400' : tier === 'Silver' ? 'text-gray-300' : 'text-amber-700';
  const progressPercent = points >= 150 ? 100 : points >= 75 ? (points / 150) * 100 : (points / 75) * 100;

  return (
    // ── Same layout shell as Dashboard & Leaderboard ──
    <div className="bg-[#0B0F1A] h-screen pt-[72px] relative overflow-hidden flex flex-col">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row flex-1 overflow-hidden w-full">
        {/* Sidebar stays visible on desktop */}
        <Sidebar userAlias={userAlias} setUserAlias={setUserAlias} />

        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full pb-28 md:pb-10 relative z-10">

          {/* ── Avatar + Name card ── */}
          <div className="liquid-glass rounded-3xl border border-white/10 p-6 shadow-2xl relative overflow-hidden mb-4 mt-4">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#7C3AED] to-[#00CFFF] opacity-15 blur-3xl pointer-events-none" />
            <div className="flex items-center gap-5 relative z-10">
              {/* Avatar circle */}
              <div className="w-16 h-16 rounded-full border-2 border-[#FFB347] flex items-center justify-center bg-[#0B0F1A] shadow-[0_0_20px_rgba(255,179,71,0.3)] shrink-0">
                <span className="text-[#FFB347] font-bold text-2xl">
                  {(user?.displayName || userAlias || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              {/* Name + alias */}
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-bold text-xl sm:text-2xl leading-tight truncate">
                  {user?.displayName || currentUserData?.name || 'Builder'}
                </h1>
                <p className="text-[#00CFFF] text-xs font-mono font-bold tracking-wider uppercase mt-0.5">
                  @{userAlias || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Email & Tier ── */}
          <div className="liquid-glass rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col gap-4 mb-4">
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Email</p>
              <p className="text-white text-sm font-medium truncate">{user?.email || '—'}</p>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Tier</p>
                <div className="flex items-center gap-2">
                  <Medal size={15} className={tierColor} />
                  <p className={`text-sm font-bold ${tierColor}`}>{tier}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Rank</p>
                <p className="text-white font-bold text-sm flex items-center gap-1.5 justify-end">
                  {rank > 0 ? `#${rank}` : 'Unranked'}
                  {rank > 0 && rank <= 10 && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded font-bold">
                      TOP 10
                    </span>
                  )}
                </p>
              </div>
            </div>
            {/* Tier Progress */}
            <div>
              <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
                <span>Progress to next tier</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Stat boxes ── */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Points', value: points, color: 'text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]' },
              { label: 'Referrals', value: referrals, color: 'text-white' },
              { label: 'Rank', value: rank > 0 ? `#${rank}` : '—', color: 'text-[#00CFFF]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="liquid-glass rounded-2xl border border-white/5 p-4 flex flex-col items-center gap-1 shadow-lg">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Referral Code (prominent copy) ── */}
          <div className="liquid-glass rounded-2xl border border-white/10 p-5 shadow-xl mb-4">
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">Your Referral Code</p>
            <div className="flex items-stretch gap-2">
              {/* Code display */}
              <div className="flex-1 flex items-center px-4 py-3 bg-black/50 border border-white/10 rounded-xl">
                <span className="text-[#00CFFF] font-mono font-bold text-base tracking-widest">@{userAlias || '—'}</span>
              </div>
              {/* Copy button — clearly visible */}
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all shrink-0 ${
                  copied
                    ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                    : 'bg-[#00CFFF]/15 border border-[#00CFFF]/30 text-[#00CFFF] hover:bg-[#00CFFF]/25'
                }`}
              >
                {copied ? (
                  <><CheckCircle2 size={16} /> Copied!</>
                ) : (
                  <><Copy size={16} /> Copy</>
                )}
              </button>
            </div>
            <p className="text-white/30 text-[10px] text-center mt-2">Share this code to earn referral points</p>
          </div>

          {/* Crown badge if top 10 */}
          {rank > 0 && rank <= 10 && (
            <div className="liquid-glass rounded-2xl border border-yellow-500/20 p-4 shadow-xl flex items-center gap-3 mb-4">
              <Crown size={20} className="text-yellow-400 shrink-0" />
              <p className="text-yellow-300 text-sm font-semibold">You're in the Top 10 nationally! 🎉</p>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUnlink}
              className="w-full liquid-glass border border-white/10 text-white/60 text-sm font-medium py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all"
            >
              Unlink Alias
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium py-3 rounded-xl hover:bg-red-500/20 transition-all"
            >
              <LogOut size={15} />
              Log Out
            </button>
          </div>

        </div>
      </main>
    </div>
  </div>
  );
}
