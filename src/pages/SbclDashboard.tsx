import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Network,
  Search,
  Share2,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  Zap,
} from 'lucide-react';
import { usePrivateSignupRows } from '../hooks/useLeaderboard';
import {
  categorizeSbclReferrals,
  exportAllNetworkToExcel,
  exportReferralsListToExcel,
  exportSubReferralRosterToExcel,
  sanitizeReferralPart,
  type CategorizedReferral,
} from '../lib/referrals';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { loadSubReferralLinks, type SubReferralLink } from '../lib/subReferrals';
import { buildSbclFormLink } from '../lib/sbclForms';
import SbclWorkspaceNav from '../components/SbclWorkspaceNav';

type DashboardFilter = 'all' | 'direct' | 'sub';

export default function SbclDashboard() {
  const { sbclCode: routeCode = '' } = useParams();
  const { user } = useAuth();
  const sbclCode = sanitizeReferralPart(routeCode || localStorage.getItem('sbcl_code') || 'SBC', 3).padEnd(3, 'X');
  const { allUsers, loading, refresh } = usePrivateSignupRows();
  const [subLinks, setSubLinks] = useState<SubReferralLink[]>([]);
  const [copied, setCopied] = useState('');
  const [assignedCode, setAssignedCode] = useState('');
  const [sbclProfile, setSbclProfile] = useState<{
    alias_id?: string;
    form_slug?: string;
    sbcl_code?: string;
    name?: string;
  } | null>(null);
  const [isAdminAccess, setIsAdminAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Table filtering and search
  const [filterType, setFilterType] = useState<DashboardFilter>('all');
  const [selectedSubReferrer, setSelectedSubReferrer] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      setCheckingAccess(false);
      return;
    }
    const currentCode = sbclCode.toUpperCase();
    Promise.all([
      supabase
        .from('sbcl_profiles')
        .select('sbcl_code,alias_id,form_slug,name,builder_signup_url')
        .or(`sbcl_code.ilike.${currentCode},alias_id.ilike.${currentCode},form_slug.ilike.${currentCode}`)
        .maybeSingle(),
      supabase
        .from('sbcl_profiles')
        .select('sbcl_code')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ])
      .then(([workspaceProfile, myProfile, admin]) => {
        setSbclProfile(workspaceProfile.data || null);
        setAssignedCode(myProfile.data ? sanitizeReferralPart(String(myProfile.data.sbcl_code), 3) : '');
        setIsAdminAccess(Boolean(admin.data));
      })
      .catch(() => {
        setSbclProfile(null);
        setAssignedCode('');
        setIsAdminAccess(false);
      })
      .finally(() => setCheckingAccess(false));
  }, [user, sbclCode]);

  useEffect(() => {
    if (!user || (!isAdminAccess && assignedCode !== sbclCode)) return;
    loadSubReferralLinks(sbclCode).then(setSubLinks).catch(() => setSubLinks([]));

    // Supabase Realtime WebSocket for live sub-referrals and submissions
    const channel = supabase
      .channel(`sbcl_dashboard_${sbclCode.toLowerCase()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sub_referrals' },
        () => {
          loadSubReferralLinks(sbclCode).then(setSubLinks).catch(() => setSubLinks([]));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sbcl_form_submissions' },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdminAccess, assignedCode, sbclCode, refresh]);

  // Categorize referrals into all referrals, his direct referrals, and sub-referral network
  const { allSignups, directSignups, subReferralSignups, subNetwork } = useMemo(
    () => categorizeSbclReferrals(allUsers, sbclCode, subLinks, sbclProfile?.name),
    [allUsers, sbclCode, subLinks, sbclProfile?.name]
  );

  // Filtered users for the signup records table
  const displayedUsers = useMemo(() => {
    let list: CategorizedReferral[] = [];
    if (filterType === 'direct') {
      list = directSignups;
    } else if (filterType === 'sub') {
      list = subReferralSignups;
    } else {
      list = allSignups;
    }

    if (selectedSubReferrer !== 'all') {
      list = list.filter(
        (u) =>
          u.subReferralCode.toUpperCase() === selectedSubReferrer.toUpperCase() ||
          u.subReferralName.toUpperCase() === selectedSubReferrer.toUpperCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.alias && u.alias.toLowerCase().includes(q)) ||
          (u.rawAlias && u.rawAlias.toLowerCase().includes(q)) ||
          (u.contact && u.contact.toLowerCase().includes(q)) ||
          (u.builderCentralId && u.builderCentralId.toLowerCase().includes(q)) ||
          (u.subReferralName && u.subReferralName.toLowerCase().includes(q)) ||
          (u.subReferralCode && u.subReferralCode.toLowerCase().includes(q))
      );
    }

    return list;
  }, [filterType, selectedSubReferrer, searchQuery, allSignups, directSignups, subReferralSignups]);

  const aliasOrCode = sbclProfile?.alias_id || sbclProfile?.form_slug || sbclCode;
  const fullAliasSlug = aliasOrCode.toLowerCase().replace(/^@/, '');
  const directFormLink = buildSbclFormLink(fullAliasSlug);
  const teamJoinLink = typeof window !== 'undefined'
    ? `${window.location.origin}/join-team/${fullAliasSlug}`
    : `/join-team/${fullAliasSlug}`;

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1600);
  };

  // Export functions
  const handleExportAll = () => {
    exportAllNetworkToExcel({
      sbclCode,
      allSignups,
      directSignups,
      subReferralSignups,
      subNetwork,
    });
  };

  const handleExportFiltered = () => {
    const filename =
      filterType === 'direct'
        ? `${sbclCode}-direct-referrals`
        : filterType === 'sub'
        ? `${sbclCode}-sub-referral-network`
        : `${sbclCode}-all-referrals`;
    exportReferralsListToExcel(displayedUsers, filename, 'Referrals');
  };

  const handleExportRoster = () => {
    exportSubReferralRosterToExcel(subNetwork, sbclCode);
  };

  const handleDeleteSubReferral = async (code: string, name: string) => {
    if (!window.confirm(`Delete sub-referrer "${name}" (${code})?\nThis will permanently remove their dedicated link (/f/${code.toLowerCase()}).`)) {
      return;
    }
    try {
      const { error } = await supabase.rpc('delete_sub_referral', { p_code: code });
      if (error) {
        await supabase.from('sub_referrals').delete().ilike('code', code);
      }
      setSubLinks((prev) => prev.filter((s) => s.code.toUpperCase() !== code.toUpperCase()));
      refresh();
    } catch (err: any) {
      alert(`Could not delete sub-referral: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteSubmission = async (record: CategorizedReferral) => {
    const displayName = record.name || record.alias || 'Unknown';
    if (!window.confirm(`Delete submission for "${displayName}" (@${record.alias})?\nThis will permanently delete this record.`)) {
      return;
    }
    try {
      if (record.id) {
        const { error } = await supabase.rpc('delete_form_submission', { p_id: Number(record.id) });
        if (error) {
          await supabase.from('sbcl_form_submissions').delete().eq('id', record.id);
        }
      } else if (record.sheetRow) {
        await supabase.from('signups').delete().eq('sheet_row', record.sheetRow);
      } else if (record.alias) {
        await supabase.from('sbcl_form_submissions').delete().ilike('alias', record.alias);
        await supabase.from('signups').delete().ilike('alias', record.alias);
      }
      refresh();
    } catch (err: any) {
      alert(`Could not delete submission: ${err.message || 'Unknown error'}`);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center">
        Checking SBCL access…
      </div>
    );
  }

  if (!user || (!isAdminAccess && assignedCode !== sbclCode)) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center px-4">
        <div className="max-w-md liquid-glass border border-white/10 rounded-3xl p-8 text-center">
          <h1 className="text-4xl mb-3">Verified SBCL access only</h1>
          <p className="text-white/45 text-sm mb-6">
            Open the Supabase invitation link sent to your invited email. Your account can access only its assigned SBCL dashboard.
          </p>
          <Link to="/auth" className="inline-flex bg-white text-black rounded-xl px-5 py-3 font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] pt-24 pb-16 px-4 sm:px-6 text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_5%,rgba(124,58,237,.18),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(0,207,255,.12),transparent_28%)]" />

      <main className="relative max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[#00CFFF] text-xs font-semibold tracking-[.24em] uppercase mb-3">
              SBCL workspace · {sbclCode}
            </p>
            <h1 className="text-4xl sm:text-6xl text-white leading-none font-bold">
              Referral command center
            </h1>
            <p className="text-white/50 mt-4 max-w-2xl text-sm sm:text-base">
              Track all referrals in your network: view your direct referrals, inspect each sub-referral team, and export verified datasets.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {isAdminAccess && (
              <Link
                to="/admin"
                className="flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                ← Admin overview
              </Link>
            )}
            <button
              onClick={handleExportFiltered}
              disabled={!displayedUsers.length}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white px-4 py-3 text-sm font-semibold transition-all disabled:opacity-40"
              title="Export current table view"
            >
              <Download size={15} /> Export current view
            </button>
            <button
              onClick={handleExportAll}
              disabled={!allSignups.length}
              className="flex items-center justify-center gap-2 rounded-xl bg-white text-[#070B14] px-5 py-3 text-sm font-semibold hover:bg-white/90 transition-all disabled:opacity-40 shadow-lg shadow-white/10"
              title="Export complete network workbook with all sheets"
            >
              <Download size={16} /> Export master Excel
            </button>
          </div>
        </header>

        {/* Workspace Navigation Bar */}
        <SbclWorkspaceNav sbclCode={sbclCode} />

        {/* Key Metrics Overview: All referrals, His direct referrals, Sub-referral network, Sub-referrers count, Points */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
          {[
            {
              label: 'All referrals',
              value: allSignups.length,
              icon: Users,
              color: '#00CFFF',
              desc: 'Total users in network',
            },
            {
              label: 'His direct referrals',
              value: directSignups.length,
              icon: UserRound,
              color: '#A78BFA',
              desc: 'Referred by you directly',
            },
            {
              label: 'Sub-referral referrals',
              value: subReferralSignups.length,
              icon: Share2,
              color: '#F59E0B',
              desc: 'From sub-referral network',
            },
            {
              label: 'All sub-referrals',
              value: subNetwork.length,
              icon: Network,
              color: '#38BDF8',
              desc: 'Active team members',
            },
            {
              label: 'Points earned',
              value: allSignups.length * 15,
              icon: Zap,
              color: '#34D399',
              desc: '15 points per signup',
            },
          ].map(({ label, value, icon: Icon, color, desc }) => (
            <div key={label} className="liquid-glass rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Icon size={18} style={{ color }} />
                  <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">
                    {sbclCode}
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {loading ? '—' : value}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5">
                <p className="text-white/70 text-xs font-medium">{label}</p>
                <p className="text-white/35 text-[11px] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Quick Link to Dedicated Referral Network Page */}
        <section className="liquid-glass rounded-2xl p-4 sm:p-5 border border-[#00CFFF]/20 bg-[#00CFFF]/5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00CFFF]/15 border border-[#00CFFF]/30 flex items-center justify-center text-[#00CFFF] shrink-0">
              <Network size={20} />
            </div>
            <div>
              <p className="font-semibold text-white text-sm sm:text-base">
                New: Dedicated Referral Network Explorer
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                Inspect your full referral hierarchy, view breakdown by sub-referrer, and download individual team spreadsheets.
              </p>
            </div>
          </div>
          <Link
            to={`/sbcl/${sbclCode}/network`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00CFFF] text-black font-semibold text-xs sm:text-sm hover:bg-[#00CFFF]/90 transition-all shrink-0"
          >
            <span>Open referral network</span>
            <ArrowUpRight size={15} />
          </Link>
        </section>

        {/* Signup Links Boxes */}
        <section className="grid lg:grid-cols-[1.05fr_.95fr] gap-5 mb-6">
          {/* Direct Signup Link Box */}
          <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Your direct signup link</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-[#00CFFF] font-mono text-sm truncate">
                  {directFormLink}
                </div>
                <button
                  onClick={() => copy(directFormLink, 'direct')}
                  className="px-4 py-3 rounded-xl bg-[#00CFFF]/15 text-[#00CFFF] border border-[#00CFFF]/25 flex items-center justify-center gap-2 text-sm shrink-0 hover:bg-[#00CFFF]/25 transition-all"
                >
                  {copied === 'direct' ? <Check size={16} /> : <Copy size={16} />}
                  {copied === 'direct' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-white/35 text-xs mt-3 leading-relaxed">
                Anyone opening <span className="text-white/70 font-mono">/f/{aliasOrCode.toLowerCase().replace(/^@/, '')}</span> is attributed to your direct referrals automatically.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
              <span className="text-white/40">Direct form preview:</span>
              <Link
                to={`/f/${aliasOrCode.toLowerCase().replace(/^@/, '')}`}
                target="_blank"
                className="text-[#00CFFF] hover:underline flex items-center gap-1"
              >
                Open dedicated form →
              </Link>
            </div>
          </div>

          {/* Sub-Referral Team Invite Link Box */}
          <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/40 text-xs uppercase tracking-widest">Sub-referral signup link</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30 font-semibold">
                  Team Invite
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-1.5">Invite new sub-referrers</h2>
              <p className="text-white/45 text-xs mb-3.5 leading-relaxed">
                Share this link with your team leaders. When they join, they receive their own dashboard and a personal <span className="font-mono text-[#00CFFF]">/f/@alias</span> signup link.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-[#A78BFA] font-mono text-sm truncate">
                  {teamJoinLink}
                </div>
                <button
                  onClick={() =>
                    copy(teamJoinLink, 'sub-invite')
                  }
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white flex items-center justify-center gap-2 text-sm font-semibold hover:opacity-95 transition-opacity shrink-0 shadow-lg shadow-purple-500/20"
                >
                  {copied === 'sub-invite' ? <Check size={16} /> : <Copy size={16} />}
                  {copied === 'sub-invite' ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs text-white/50 font-medium">Team Sub-Referrers ({subNetwork.length})</p>
                <Link
                  to={`/sbcl/${sbclCode}/network`}
                  className="text-[11px] text-[#00CFFF] hover:underline"
                >
                  Manage all sub-referrals →
                </Link>
              </div>
              {subNetwork.length === 0 ? (
                <p className="text-xs text-white/35 italic py-2">
                  No sub-referrers have signed up yet. Share your team signup link above.
                </p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {subNetwork.slice(0, 5).map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between p-2.5 bg-black/25 rounded-xl border border-white/5"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs text-white font-medium truncate">{item.name}</p>
                        <p className="text-[11px] font-mono text-[#00CFFF] truncate">
                          /f/{item.code.toLowerCase()} · {item.referralCount} signups
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copy(item.link, item.code)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs flex items-center gap-1 transition-all"
                          title="Copy personal form link"
                        >
                          {copied === item.code ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span className="text-[10px]">{copied === item.code ? 'Copied' : 'Copy form'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSubReferral(item.code, item.name)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-300 transition-all"
                          title="Delete sub-referrer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section: Sub-Referral Network Performance & Signups Table */}
        <section className="grid lg:grid-cols-[.78fr_1.22fr] gap-5">
          {/* Sub-referral Network Performance Panel */}
          <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">Sub-referral network</h2>
                <button
                  onClick={handleExportRoster}
                  disabled={!subNetwork.length}
                  className="text-xs text-white/60 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-30"
                  title="Export team roster to Excel"
                >
                  <Download size={13} /> Export roster
                </button>
              </div>
              <p className="text-white/40 text-xs mb-5">
                Every sub-referral team member and their contribution to your overall network.
              </p>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {!subNetwork.length && (
                  <p className="text-white/40 text-sm py-4">No sub-referral network activity yet.</p>
                )}
                {subNetwork.map((member, index) => {
                  const isFiltered = selectedSubReferrer.toUpperCase() === member.code.toUpperCase();
                  return (
                    <div
                      key={member.code}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isFiltered
                          ? 'border-[#00CFFF] bg-[#00CFFF]/10 shadow-sm'
                          : 'bg-white/[.03] border-white/[.06] hover:bg-white/[.06]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{member.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded">
                              {member.code}
                            </span>
                            <span className="text-white/30 text-[11px]">#{index + 1} team rank</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-white">{member.referralCount}</p>
                          <p className="text-emerald-400 text-[11px] font-medium">{member.points} pts</p>
                          {member.flaggedCount > 0 && (
                            <p className="text-[10px] text-amber-400/80 font-mono mt-0.5">
                              ({member.flaggedCount} flagged)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                        <button
                          onClick={() => {
                            if (isFiltered) {
                              setSelectedSubReferrer('all');
                            } else {
                              setSelectedSubReferrer(member.code);
                              setFilterType('sub');
                            }
                          }}
                          className={`text-[11px] font-medium transition-colors ${
                            isFiltered ? 'text-[#00CFFF]' : 'text-white/60 hover:text-white'
                          }`}
                        >
                          {isFiltered ? '✓ Showing in table below' : 'Filter table to their signups →'}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copy(member.link, `dash-${member.code}`)}
                            className="text-[11px] text-white/40 hover:text-white flex items-center gap-1"
                          >
                            {copied === `dash-${member.code}` ? (
                              <span className="text-emerald-400">Copied</span>
                            ) : (
                              <>
                                <Copy size={11} /> Copy link
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteSubReferral(member.code, member.name)}
                            className="text-[11px] text-red-400/60 hover:text-red-300 flex items-center gap-1 transition-colors"
                            title="Delete sub-referrer"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-white/40">Need granular sub-referral charts?</span>
              <Link to={`/sbcl/${sbclCode}/network`} className="text-[#00CFFF] hover:underline flex items-center gap-1 font-medium">
                Open full referral network →
              </Link>
            </div>
          </div>

          {/* Signup Records Table Panel */}
          <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden flex flex-col justify-between">
            <div>
              {/* Table Header and Filter Controls */}
              <div className="p-5 border-b border-white/10 bg-black/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Signup records</h2>
                    <p className="text-xs text-white/35 mt-0.5">
                      All users and referrals visible to you · Auto-syncs every 3 seconds
                    </p>
                  </div>
                  {/* Category Filter Pills */}
                  <div className="inline-flex p-1 bg-black/30 rounded-xl border border-white/10">
                    <button
                      onClick={() => {
                        setFilterType('all');
                        setSelectedSubReferrer('all');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterType === 'all'
                          ? 'bg-white text-black font-semibold'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      All ({allSignups.length})
                    </button>
                    <button
                      onClick={() => {
                        setFilterType('direct');
                        setSelectedSubReferrer('all');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterType === 'direct'
                          ? 'bg-[#A78BFA] text-black font-semibold'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      Direct ({directSignups.length})
                    </button>
                    <button
                      onClick={() => setFilterType('sub')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterType === 'sub'
                          ? 'bg-[#F59E0B] text-black font-semibold'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      Sub-referrals ({subReferralSignups.length})
                    </button>
                  </div>
                </div>

                {/* Search & Sub-referrer filter dropdown */}
                <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, email, AWS alias, phone…"
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#00CFFF]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {subNetwork.length > 0 && filterType !== 'direct' && (
                    <select
                      value={selectedSubReferrer}
                      onChange={(e) => setSelectedSubReferrer(e.target.value)}
                      className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00CFFF] max-w-[200px]"
                    >
                      <option value="all">All sub-referrers</option>
                      {subNetwork.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.name} ({m.referralCount})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="sticky top-0 bg-[#0B0F1A] text-left text-white/35 text-[10px] uppercase tracking-widest z-10">
                    <tr>
                      <th className="p-4 pl-6">Participant</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">AWS Alias</th>
                      <th className="p-4">Builder ID</th>
                      <th className="p-4">Referred by</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && !displayedUsers.length && (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-white/35">
                          {searchQuery || selectedSubReferrer !== 'all'
                            ? 'No referrals match your search or filter.'
                            : `No signups found for this category under ${sbclCode}.`}
                        </td>
                      </tr>
                    )}
                    {displayedUsers.map((user, index) => (
                      <tr
                        key={`${user.alias}-${index}`}
                        className="border-t border-white/[.06] hover:bg-white/[.02] transition-colors"
                      >
                        <td className="p-4 pl-6 text-white font-medium">
                          {user.name || '—'}
                          {user.nameOnAws && (
                            <span className="block text-[11px] text-white/35">
                              AWS name: {user.nameOnAws}
                            </span>
                          )}
                          {!user.isValid && user.flagReason && (
                            <span className="block text-[11px] text-amber-400/80 font-normal">
                              ⚠ {user.flagReason}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-white/55 font-mono text-xs">{user.email || '—'}</td>
                        <td className="p-4 text-white/55 text-xs">{user.contact || '—'}</td>
                        <td className="p-4 font-mono text-[#00CFFF]">@{user.alias}</td>
                        <td className="p-4 text-white/55 text-xs">
                          {user.builderCentralId === 'NO' ? (
                            <span className="text-amber-400/80">Pending</span>
                          ) : user.builderCentralId ? (
                            <span className="text-emerald-400 font-medium">Recorded</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-4 text-xs">
                          {user.isDirect ? (
                            <span className="inline-flex items-center gap-1 text-[#A78BFA] font-medium bg-[#7C3AED]/15 px-2 py-0.5 rounded border border-[#7C3AED]/25">
                              <UserCheck size={11} />
                              Direct SBCL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#F59E0B] font-medium bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/20">
                              <Share2 size={11} />
                              {user.subReferralName}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs">
                          {user.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg">
                              ✓ Valid (+15)
                            </span>
                          ) : user.status === 'existing_in_record' ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg"
                              title={user.flagReason || 'Already in database record (student mega sheet)'}
                            >
                              In DB Record (0)
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-lg"
                              title={user.flagReason || 'Duplicate alias ID'}
                            >
                              Duplicate (0)
                            </span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => handleDeleteSubmission(user)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-300 transition-colors inline-flex items-center gap-1 text-xs"
                            title="Delete submission"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-black/25 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
              <span>Showing {displayedUsers.length} of {allSignups.length} total referrals</span>
              <button
                onClick={handleExportFiltered}
                disabled={!displayedUsers.length}
                className="text-[#00CFFF] hover:underline flex items-center gap-1 font-medium disabled:opacity-40"
              >
                <Download size={13} /> Export these records
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
