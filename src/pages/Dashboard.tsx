import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { Copy, CheckCircle2, BookOpen, Crown, Users, Bell, ExternalLink } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TierToast from '../components/TierToast';
import { Link } from 'react-router-dom';
import { getTierForReferrals, getNextTier } from '../lib/tiers';
import { normalizeAlias } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const { leaderboard, allUsers, loading: dataLoading } = useLeaderboard();

  const [userAlias, setUserAlias] = useState(localStorage.getItem('aws_alias') || '');
  const [aliasInput, setAliasInput] = useState('');
  const [aliasError, setAliasError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedSignup, setCopiedSignup] = useState(false);
  const [copiedForm, setCopiedForm] = useState(false);

  useEffect(() => {
    if (user && leaderboard.length > 0 && !dataLoading) {
      const currentExists = leaderboard.some(u => u.alias.toUpperCase() === userAlias.toUpperCase());
      if (!currentExists) {
        const foundByName = leaderboard.find(u => u.name.toLowerCase() === user.displayName?.toLowerCase());
        if (foundByName) {
          localStorage.setItem('aws_alias', foundByName.alias);
          setUserAlias(foundByName.alias);
        }
      }
    }
  }, [userAlias, user, leaderboard, dataLoading]);

  const handleAliasChange = (value: string) => {
    setAliasInput(value);
    if (/\s/.test(value)) {
      setAliasError('Alias ID must not contain spaces. Please remove any spaces and try again.');
    } else {
      setAliasError('');
    }
  };

  const handleSaveAlias = (e: React.FormEvent) => {
    e.preventDefault();
    // Final guard — reject if spaces still present
    if (/\s/.test(aliasInput)) {
      setAliasError('Alias ID must not contain spaces. Please remove any spaces and try again.');
      console.warn('[Alias] Submission blocked: input contains spaces →', JSON.stringify(aliasInput));
      return;
    }
    const normalized = normalizeAlias(aliasInput);
    if (normalized) {
      localStorage.setItem('aws_alias', normalized);
      setUserAlias(normalized);
    }
  };

  // Alias setup screen
  if (!userAlias) {
    return (
    <div className="bg-[#0B0F1A] min-h-screen pt-[72px] relative overflow-x-hidden">
      <div className="max-w-[1440px] mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-72px)] p-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7C3AED] rounded-full blur-[200px] opacity-[0.15] pointer-events-none" />
        <div className="liquid-glass w-full max-w-md p-8 sm:p-10 rounded-3xl border border-white/10 relative z-10 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to AWS Builders!</h2>
          <p className="text-white/60 mb-8 text-sm leading-relaxed">
            Enter your AWS Alias exactly as you submitted it in the Google Form to link your dashboard.
          </p>
          <form onSubmit={handleSaveAlias} className="flex flex-col gap-5">
            <div>
              <label className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2 block">AWS Alias</label>
              <input
                type="text"
                value={aliasInput}
                onChange={e => handleAliasChange(e.target.value)}
                required
                placeholder="e.g. JDOE123"
                className={`w-full bg-black/20 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all ${
                  aliasError
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-white/10 focus:border-[#00CFFF] focus:ring-1 focus:ring-[#00CFFF]'
                }`}
              />
              {aliasError && (
                <div className="flex items-start gap-2 mt-2 px-1">
                  <span className="text-red-400 text-[11px] leading-snug">
                    ⚠️ {aliasError}
                  </span>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!!aliasError}
              className={`text-white font-medium py-3.5 rounded-xl transition-all ${
                aliasError
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:opacity-90 shadow-[0_0_20px_rgba(124,58,237,0.4)]'
              }`}
            >
              Link Alias
            </button>
          </form>
        </div>
      </div>
    </div>
    );
  }

  const myAlias = normalizeAlias(userAlias);

  const currentUserData = leaderboard.find(u => normalizeAlias(u.alias) === myAlias);
  const rank = leaderboard.findIndex(u => normalizeAlias(u.alias) === myAlias) + 1;
  const isTop10 = rank > 0 && rank <= 10;

  // Build processed users, flagging duplicates
  const seenAliases = new Set<string>();
  const allProcessedUsers = allUsers.map(u => {
    const alias = normalizeAlias(u.alias);
    const isDuplicate = seenAliases.has(alias);
    seenAliases.add(alias);
    return { ...u, alias, isDuplicate };
  });

  // Users who entered MY alias as their referral code
  const referredUsers = allProcessedUsers.filter(u => normalizeAlias(u.referralCode) === myAlias);

  const handleCopy = () => {
    navigator.clipboard.writeText(userAlias);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const points    = currentUserData?.points    || 0;
  const referrals  = currentUserData?.referrals  || 0;
  const currentTier = getTierForReferrals(referrals);
  const nextTier    = getNextTier(currentTier);
  const progressPct = nextTier
    ? Math.min((referrals / nextTier.minReferrals) * 100, 100)
    : 100;

  return (
    <div className="bg-[#0B0F1A] h-screen pt-[72px] relative overflow-hidden flex flex-col">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row flex-1 overflow-hidden w-full">
        {/* Real-time tier unlock toast */}
        <TierToast referrals={referrals} />
        <Sidebar userAlias={userAlias} setUserAlias={setUserAlias} />

        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full pb-28 md:pb-10">

          {/* Welcome banner */}
          <div className="liquid-glass p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden mb-5 group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#7C3AED] to-[#00CFFF] opacity-15 blur-3xl group-hover:opacity-25 transition-opacity pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-semibold">Welcome back</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00CFFF] to-[#7C3AED] leading-tight">
                  {user?.displayName || currentUserData?.name || userAlias}
                </h1>
                <p className="text-white/40 text-xs sm:text-sm mt-1">Share your referral code to earn points and climb the board.</p>
              </div>
              {/* Right actions: Rewards + Profile */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/notifications"
                  className="flex items-center gap-2 px-4 py-2 liquid-glass border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-[#7C3AED]/40 transition-all text-sm"
                >
                  <Bell size={15} className="text-[#7C3AED]" />
                  <span className="hidden sm:inline">Rewards</span>
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 liquid-glass border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-[#00CFFF]/40 transition-all text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#4F46E5] flex items-center justify-center text-white font-bold text-[11px]">
                    {userAlias.charAt(0).toUpperCase()}
                  </div>
                  <span>Profile</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Compact Stat Boxes ── */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
            {/* Points */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#7C3AED]/20 blur-2xl rounded-full" />
              <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-2 font-semibold">Points</p>
              <p className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]">
                {dataLoading ? '—' : points}
              </p>
            </div>
            {/* Referrals */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#00CFFF]/10 blur-2xl rounded-full" />
              <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-2 font-semibold">Referrals</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {dataLoading ? '—' : referrals}
              </p>
            </div>
            {/* Rank */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#FFB347]/10 blur-2xl rounded-full" />
              <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-2 font-semibold">Rank</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {dataLoading ? '—' : rank > 0 ? `#${rank}` : '—'}
                </p>
                {isTop10 && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 rounded font-bold animate-pulse">
                    TOP 10
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Referral Code + Tier row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
            {/* Referral code copy — split display + button */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Your Referral Code</p>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 flex items-center px-4 py-3 bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                  <span className="text-[#00CFFF] font-mono font-bold tracking-widest text-sm truncate">@{userAlias}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-xs transition-all shrink-0 ${
                    copied
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                      : 'bg-[#00CFFF]/15 border border-[#00CFFF]/30 text-[#00CFFF] hover:bg-[#00CFFF]/25'
                  }`}
                >
                  {copied ? (
                    <><CheckCircle2 size={14} /> Copied!</>
                  ) : (
                    <><Copy size={14} /> Copy</>
                  )}
                </button>
              </div>
            </div>
            {/* Tier — new badge-based card */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Your Tier</p>
                <Crown size={14} style={{ color: currentTier.color }} />
              </div>
              <div className="flex items-center gap-3">
                <img src={currentTier.badge} alt={currentTier.name} className="w-10 h-10 object-contain shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white leading-tight">{currentTier.name}</p>
                  {nextTier && (
                    <>
                      <div className="flex items-center justify-between mt-1 mb-1">
                        <span className="text-white/30 text-[9px] font-semibold uppercase tracking-widest">
                          Next: {nextTier.name}
                        </span>
                        <span className="text-white/30 text-[9px] font-semibold">
                          {referrals}/{nextTier.minReferrals}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${progressPct}%`,
                            background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`,
                          }}
                        />
                      </div>
                    </>
                  )}
                  {!nextTier && (
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: currentTier.color }}>Max Tier 🏆</p>
                  )}
                </div>
              </div>
              <Link
                to="/rewards"
                className="text-center text-[10px] font-bold uppercase tracking-widest py-1.5 rounded-lg transition-all"
                style={{ background: `${currentTier.color}15`, color: currentTier.color }}
              >
                View All Badges →
              </Link>
            </div>
          </div>

          {/* Quick Links & Step Guide Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {/* Resource Links */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="liquid-glass p-5 rounded-2xl border border-white/5 flex flex-col h-full">
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                  <BookOpen size={16} className="text-[#00CFFF]" />
                  Campaign Links
                </h3>
                
                <div className="space-y-3">
                  {/* Signup Link */}
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl group hover:border-[#7C3AED]/30 transition-all">
                    <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-2">1. Signup Link</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-white/60 font-mono truncate">bit.ly/4cvi5S6</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('https://bit.ly/4cvi5S6');
                            setCopiedSignup(true);
                            setTimeout(() => setCopiedSignup(false), 2000);
                          }}
                          className={`p-1.5 rounded-md transition-all ${copiedSignup ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                          title={copiedSignup ? "Copied!" : "Copy Link"}
                        >
                          {copiedSignup ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        </button>
                        <a 
                          href="https://bit.ly/4cvi5S6" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-[#7C3AED]/20 rounded-md text-[#7C3AED] transition-all"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Google Form Link */}
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl group hover:border-[#00CFFF]/30 transition-all">
                    <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-2">2. Submission Form</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-white/60 font-mono truncate">forms.gle/PGhwQv...</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('https://forms.gle/PGhwQvEUXNwWFJ7L7');
                            setCopiedForm(true);
                            setTimeout(() => setCopiedForm(false), 2000);
                          }}
                          className={`p-1.5 rounded-md transition-all ${copiedForm ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                          title={copiedForm ? "Copied!" : "Copy Link"}
                        >
                          {copiedForm ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        </button>
                        <a 
                          href="https://forms.gle/PGhwQvEUXNwWFJ7L7" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-[#00CFFF]/20 rounded-md text-[#00CFFF] transition-all"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="lg:col-span-2">
              <div className="liquid-glass p-5 rounded-2xl border border-white/5 h-full">
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-400" />
                  How to get your signups
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { text: "Open the signup link: bit.ly/4cvi5S6", icon: "1" },
                    { text: "Sign in / create your account", icon: "2" },
                    { text: "Click on your profile icon (top right)", icon: "3" },
                    { text: "Tap on 'QR Code' in the menu", icon: "4" },
                    { text: "Copy your alias (e.g. @username)", icon: "5" },
                    { text: "Submit it here: forms.gle/PGhwQv...", icon: "6" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 border border-white/10">
                        {step.icon}
                      </span>
                      <p className="text-[11px] text-white/70 leading-snug">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Referral Management Table */}
          <div className="liquid-glass rounded-2xl overflow-hidden border border-white/5 shadow-xl">
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-white/5 flex items-center justify-between bg-black/20">
              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <Users size={16} className="text-[#00CFFF]" />
                Referral Network
              </h2>
              <span className="px-2.5 py-1 bg-[#7C3AED]/20 border border-[#7C3AED]/30 rounded-full text-[#7C3AED] text-[10px] font-semibold tracking-wider uppercase">
                {referredUsers.length} Users
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[380px]">
                <thead className="bg-black/40 text-white/40 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 pl-5 sm:pl-6 font-semibold w-10">#</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Alias</th>
                    <th className="p-4 font-semibold text-right pr-5 sm:pr-6">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-white/50 text-sm">Loading referrals...</td></tr>
                  ) : referredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center bg-black/10">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 border border-white/5">
                          <BookOpen className="text-white/20" size={20} />
                        </div>
                        <p className="text-white/60 font-medium text-sm">No referrals yet</p>
                        <p className="text-white/30 text-xs mt-1">Share your alias code to start earning!</p>
                      </td>
                    </tr>
                  ) : (
                    referredUsers.map((u, idx) => (
                      <tr key={idx} className="border-b border-white/5 text-white hover:bg-white/5 transition-colors group">
                        <td className="p-4 pl-5 sm:pl-6 font-mono text-white/30 text-xs">{idx + 1}</td>
                        <td className="p-4 font-medium text-sm">{u.name || '—'}</td>
                        <td className="p-4">
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-white/5 rounded-md text-white/60 border border-white/10">
                            @{u.alias}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-5 sm:pr-6">
                          {u.isDuplicate ? (
                            <span className="text-[9px] font-bold uppercase text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
                              Duplicate
                            </span>
                          ) : (
                            <span className="text-[#00CFFF] font-bold bg-[#00CFFF]/10 px-2.5 py-1 rounded-full text-sm">+15</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
  );
}
