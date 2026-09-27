import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { Copy, CheckCircle2, BookOpen, Crown, Users, Bell, ExternalLink } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TierToast from '../components/TierToast';
import { Link } from 'react-router-dom';
import { getTierForReferrals, getNextTier } from '../lib/tiers';
import { normalizeAlias } from '../lib/utils';
import { supabase } from '../lib/supabase';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/FR4Oatt1VBu3LXw8E25LCx';

function WhatsAppIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.456h.005c6.554 0 11.89-5.336 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { leaderboard, allUsers, loading: dataLoading } = useLeaderboard();

  const [userAlias, setUserAlias] = useState(localStorage.getItem('aws_alias') || '');
  const [aliasInput, setAliasInput] = useState('');
  const [aliasError, setAliasError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedSignup, setCopiedSignup] = useState(false);
  const [copiedForm, setCopiedForm] = useState(false);
  const [sbclSignupUrl, setSbclSignupUrl] = useState('https://bit.ly/4cvi5S6');
  const [sbclName, setSbclName] = useState('');

  useEffect(() => {
    const cleanAlias = normalizeAlias(userAlias);
    const storedSbcl = localStorage.getItem('sub_referrer_sbcl');

    async function resolveSbcl() {
      try {
        let sbclCode = storedSbcl;
        if (!sbclCode && (user?.id || cleanAlias)) {
          const filter = user?.id
            ? `created_by.eq.${user.id},code.eq.${cleanAlias}`
            : `code.eq.${cleanAlias}`;
          const { data: sub } = await supabase.from('sub_referrals').select('sbcl_code').or(filter).limit(1).maybeSingle();
          if (sub?.sbcl_code) {
            sbclCode = sub.sbcl_code;
            localStorage.setItem('sub_referrer_sbcl', sub.sbcl_code);
          }
        }

        if (sbclCode) {
          const { data: profile } = await supabase
            .from('sbcl_profiles')
            .select('name,builder_signup_url')
            .eq('sbcl_code', sbclCode)
            .maybeSingle();

          if (profile?.builder_signup_url) {
            setSbclSignupUrl(profile.builder_signup_url);
          }
          if (profile?.name) {
            setSbclName(profile.name);
          }
        }
      } catch (err) {
        console.warn('Could not load SBCL signup link:', err);
      }
    }

    resolveSbcl();
  }, [user, userAlias]);

  // Sync real full name from Google/auth account to sub_referrals and submissions
  useEffect(() => {
    if (!user || !userAlias) return;
    const cleanAlias = normalizeAlias(userAlias);
    const realName = String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim();
    if (cleanAlias && realName && realName.toUpperCase() !== cleanAlias.toUpperCase()) {
      supabase
        .from('sub_referrals')
        .update({ name: realName, created_by: user.id })
        .ilike('code', cleanAlias)
        .then(() => {
          supabase
            .from('sbcl_form_submissions')
            .update({ referred_by_name: realName })
            .ilike('referral_code', cleanAlias);
        });
    }
  }, [user, userAlias]);

  useEffect(() => {
    if (user && leaderboard.length > 0 && !dataLoading) {
      const currentExists = leaderboard.some(u => u.alias.toUpperCase() === userAlias.toUpperCase());
      if (!currentExists) {
        const fullName = String(user.user_metadata?.full_name || '');
        const foundByName = leaderboard.find(u => u.name.toLowerCase() === fullName.toLowerCase());
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
      const realName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
      if (realName && realName.toUpperCase() !== normalized.toUpperCase()) {
        supabase
          .from('sub_referrals')
          .update({ name: realName, created_by: user?.id })
          .ilike('code', normalized)
          .then(() => {
            supabase
              .from('sbcl_form_submissions')
              .update({ referred_by_name: realName })
              .ilike('referral_code', normalized);
          });
      }
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

  // Build processed users, flagging duplicates & pre-existing records
  const seenAliases = new Set<string>();
  const allProcessedUsers = allUsers.map(u => {
    const alias = normalizeAlias(u.alias);
    const isPreExisting = u.isValid === false && (
      (u.flagReason || '').toLowerCase().includes('record') ||
      (u.flagReason || '').toLowerCase().includes('existing') ||
      (u.flagReason || '').toLowerCase().includes('sheet')
    );
    const isDuplicate = seenAliases.has(alias) || (u.isValid === false && !isPreExisting);
    if (alias) seenAliases.add(alias);
    const isFlagged = isPreExisting || isDuplicate || u.isValid === false;
    const flagReason = u.flagReason || (isPreExisting ? 'Already in database record (student mega sheet)' : isDuplicate ? 'Already signed up / account already claimed' : '');
    return { ...u, alias, isDuplicate, isPreExisting, isFlagged, flagReason };
  });

  // Users who entered MY alias as their referral code
  const referredUsers = allProcessedUsers.filter(u => normalizeAlias(u.referralCode) === myAlias);
  const validReferredUsers = referredUsers.filter(u => !u.isFlagged);

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/f/${myAlias.toLowerCase()}`
    : `/f/${myAlias.toLowerCase()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const referrals  = currentUserData ? currentUserData.referrals : validReferredUsers.length;
  const points    = currentUserData ? currentUserData.points : validReferredUsers.length * 15;
  const currentTier = getTierForReferrals(referrals);
  const nextTier    = getNextTier(currentTier);
  const progressPct = nextTier
    ? Math.min((referrals / nextTier.minReferrals) * 100, 100)
    : 100;

  return (
    <div className="bg-[#0B0F1A] min-h-screen md:h-screen pt-[72px] relative md:overflow-hidden flex flex-col">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row flex-1 md:overflow-hidden w-full">
        {/* Real-time tier unlock toast */}
        <TierToast referrals={referrals} />
        <Sidebar userAlias={userAlias} setUserAlias={setUserAlias} />

        <main className="flex-1 flex flex-col md:overflow-y-auto overflow-x-hidden">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full pb-28 md:pb-10">

          {/* Welcome banner */}
          <div className="liquid-glass p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden mb-5 group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#7C3AED] to-[#00CFFF] opacity-15 blur-3xl group-hover:opacity-25 transition-opacity pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-semibold">Welcome back</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00CFFF] to-[#7C3AED] leading-tight">
                  {String(user?.user_metadata?.full_name || '') || currentUserData?.name || userAlias}
                </h1>
                <p className="text-white/40 text-xs sm:text-sm mt-1">Share your referral link to earn points and climb the board.</p>
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

          {/* ── Compact Stat Boxes & Community ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            {/* Points */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#7C3AED]/20 blur-2xl rounded-full" />
              <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-2 font-semibold">Points</p>
              <p className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]">
                {dataLoading ? '—' : points}
              </p>
            </div>
            {/* Referrals */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#00CFFF]/10 blur-2xl rounded-full" />
              <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-2 font-semibold">Referrals</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {dataLoading ? '—' : referrals}
              </p>
            </div>
            {/* Rank */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
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
            {/* WhatsApp Community Box (After Rank Box) */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#25D366]/20 blur-2xl rounded-full pointer-events-none" />
              <div>
                <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-1.5 font-semibold">Community</p>
                <p className="text-[11px] sm:text-xs text-white/80 font-medium leading-tight">
                  For updates and all, join the WhatsApp community.
                </p>
              </div>
              <a
                href={WHATSAPP_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs text-white bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] transition-all shadow-md shadow-[#25D366]/20 group shrink-0"
              >
                <WhatsAppIcon size={15} className="shrink-0 transition-transform group-hover:scale-110" />
                <span className="truncate">Join WhatsApp Community</span>
              </a>
            </div>
          </div>

          {/* Referral Link + Tier row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
            {/* Referral link copy — split display + button */}
            <div className="liquid-glass p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Your Referral Link</p>
                  <a
                    href={referralLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#00CFFF] hover:underline flex items-center gap-1 font-mono"
                  >
                    Open form <ExternalLink size={10} />
                  </a>
                </div>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 flex items-center px-3.5 py-3 bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                    <span className="text-[#00CFFF] font-mono font-medium text-xs truncate">{referralLink}</span>
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
                      <><Copy size={14} /> Copy link</>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-white/35">
                Share this dedicated form link. Submissions attribute referrals directly to you (@{myAlias}).
              </p>
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
                  {/* 1. SBCL Builder Signup Link */}
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl group hover:border-[#7C3AED]/30 transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold">1. Builder Signup Link</p>
                      {sbclName && <span className="text-[9px] text-[#A78BFA] font-medium truncate max-w-[140px]">{sbclName}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-white/60 font-mono truncate">{sbclSignupUrl.replace(/^https?:\/\//, '')}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(sbclSignupUrl);
                            setCopiedSignup(true);
                            setTimeout(() => setCopiedSignup(false), 2000);
                          }}
                          className={`p-1.5 rounded-md transition-all ${copiedSignup ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                          title={copiedSignup ? "Copied!" : "Copy Link"}
                        >
                          {copiedSignup ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        </button>
                        <a 
                          href={sbclSignupUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-[#7C3AED]/20 rounded-md text-[#7C3AED] transition-all"
                          title="Open signup page"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* 2. Personal /f/@alias Form Link */}
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl group hover:border-[#00CFFF]/30 transition-all">
                    <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-1.5">2. Your Dedicated Form Link</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#00CFFF] font-mono truncate">{`/f/${myAlias.toLowerCase()}`}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => {
                            const formUrl = `${window.location.origin}/f/${myAlias.toLowerCase()}`;
                            navigator.clipboard.writeText(formUrl);
                            setCopiedForm(true);
                            setTimeout(() => setCopiedForm(false), 2000);
                          }}
                          className={`p-1.5 rounded-md transition-all ${copiedForm ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                          title={copiedForm ? "Copied!" : "Copy Link"}
                        >
                          {copiedForm ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        </button>
                        <a 
                          href={`${window.location.origin}/f/${myAlias.toLowerCase()}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-[#00CFFF]/20 rounded-md text-[#00CFFF] transition-all"
                          title="Open your personal form"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                    <p className="text-[9px] text-white/35 mt-1.5">
                      Submissions through this form link attribute the referral to you (@{myAlias}) automatically.
                    </p>
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
                    {
                      label: "Open the signup link:",
                      linkText: sbclSignupUrl.replace(/^https?:\/\//, ''),
                      href: sbclSignupUrl,
                      icon: "1",
                    },
                    {
                      label: "Sign in / create your account",
                      icon: "2",
                    },
                    {
                      label: "Click on your profile icon (top right)",
                      icon: "3",
                    },
                    {
                      label: "Tap on 'QR Code' in the menu",
                      icon: "4",
                    },
                    {
                      label: "Copy your alias (e.g. @username)",
                      icon: "5",
                    },
                    {
                      label: "Submit it here:",
                      linkText: `/f/${myAlias.toLowerCase()}`,
                      href: `${window.location.origin}/f/${myAlias.toLowerCase()}`,
                      icon: "6",
                      highlight: true,
                    },
                  ].map((step, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        step.highlight
                          ? 'border-[#00CFFF]/30 bg-[#00CFFF]/5'
                          : 'border-white/5 bg-black/20'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                          step.highlight
                            ? 'bg-[#00CFFF]/20 text-[#00CFFF] border-[#00CFFF]/30'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}
                      >
                        {step.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white/70 leading-snug">
                          {step.href ? (
                            <a
                              href={step.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/80 hover:text-[#00CFFF] transition-colors inline-flex items-center gap-1.5 flex-wrap font-medium"
                            >
                              <span>{step.label}</span>
                              <span className="font-mono text-[#00CFFF] font-semibold underline decoration-[#00CFFF]/40 hover:decoration-[#00CFFF]">
                                {step.linkText}
                              </span>
                              <ExternalLink size={11} className="text-[#00CFFF]/70 shrink-0" />
                            </a>
                          ) : (
                            step.label
                          )}
                        </p>
                      </div>
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
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-semibold tracking-wider uppercase">
                  {validReferredUsers.length} Valid
                </span>
                {referredUsers.length - validReferredUsers.length > 0 && (
                  <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-[10px] font-semibold tracking-wider uppercase">
                    {referredUsers.length - validReferredUsers.length} Flagged
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[420px]">
                <thead className="bg-black/40 text-white/40 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 pl-5 sm:pl-6 font-semibold w-10">#</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Alias</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right pr-5 sm:pr-6">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-white/50 text-sm">Loading referrals...</td></tr>
                  ) : referredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center bg-black/10">
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
                        <td className="p-4">
                          <p className="font-medium text-sm text-white">{u.name || '—'}</p>
                          {u.isFlagged && u.flagReason && (
                            <p className="text-[11px] text-amber-400/80 mt-0.5 font-sans leading-tight">
                              ⚠ {u.flagReason}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-white/5 rounded-md text-white/60 border border-white/10">
                            @{u.alias}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.isPreExisting ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg"
                              title="Already in club database from student mega sheet"
                            >
                              In DB Record
                            </span>
                          ) : u.isDuplicate ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-lg"
                              title="Already claimed by an earlier submission"
                            >
                              Duplicate
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg">
                              ✓ Valid
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right pr-5 sm:pr-6">
                          {u.isFlagged ? (
                            <span className="text-white/30 font-mono text-xs">0 pts</span>
                          ) : (
                            <span className="text-[#00CFFF] font-bold bg-[#00CFFF]/10 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                              +15 pts
                            </span>
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
