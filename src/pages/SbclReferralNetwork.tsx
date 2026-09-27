import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  Filter,
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
import SbclWorkspaceNav from '../components/SbclWorkspaceNav';

type NetworkTab = 'all' | 'direct' | 'sub' | 'roster';

export default function SbclReferralNetwork() {
  const { sbclCode: routeCode = '' } = useParams();
  const { user } = useAuth();
  const sbclCode = sanitizeReferralPart(routeCode || localStorage.getItem('sbcl_code') || 'SBC', 3).padEnd(3, 'X');
  const { allUsers, loading, refresh } = usePrivateSignupRows();
  const [subLinks, setSubLinks] = useState<SubReferralLink[]>([]);
  const [assignedCode, setAssignedCode] = useState('');
  const [sbclProfile, setSbclProfile] = useState<{ alias_id?: string; form_slug?: string; sbcl_code?: string; name?: string } | null>(null);
  const [isAdminAccess, setIsAdminAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<NetworkTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCode, setSelectedSubCode] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    if (!user) {
      setCheckingAccess(false);
      return;
    }
    const currentCode = sbclCode.toUpperCase();
    Promise.all([
      supabase
        .from('sbcl_profiles')
        .select('sbcl_code,alias_id,form_slug,name')
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
      .channel(`sbcl_network_${sbclCode.toLowerCase()}`)
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

  // Categorize all referrals for this SBCL
  const { allSignups, directSignups, subReferralSignups, subNetwork } = useMemo(
    () => categorizeSbclReferrals(allUsers, sbclCode, subLinks, sbclProfile?.name),
    [allUsers, sbclCode, subLinks, sbclProfile?.name]
  );

  // Filtered rows for the table
  const displayedSignups = useMemo(() => {
    let list: CategorizedReferral[] = [];
    if (activeTab === 'direct') {
      list = directSignups;
    } else if (activeTab === 'sub') {
      list = subReferralSignups;
    } else {
      list = allSignups;
    }

    if (selectedSubCode !== 'all') {
      list = list.filter(
        (user) =>
          user.subReferralCode.toUpperCase() === selectedSubCode.toUpperCase() ||
          user.subReferralName.toUpperCase() === selectedSubCode.toUpperCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (user) =>
          (user.name && user.name.toLowerCase().includes(q)) ||
          (user.email && user.email.toLowerCase().includes(q)) ||
          (user.alias && user.alias.toLowerCase().includes(q)) ||
          (user.rawAlias && user.rawAlias.toLowerCase().includes(q)) ||
          (user.contact && user.contact.toLowerCase().includes(q)) ||
          (user.builderCentralId && user.builderCentralId.toLowerCase().includes(q)) ||
          (user.subReferralName && user.subReferralName.toLowerCase().includes(q)) ||
          (user.subReferralCode && user.subReferralCode.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeTab, allSignups, directSignups, subReferralSignups, selectedSubCode, searchQuery]);

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1600);
  };

  // Export handlers
  const handleExportMaster = () => {
    exportAllNetworkToExcel({
      sbclCode,
      allSignups,
      directSignups,
      subReferralSignups,
      subNetwork,
    });
  };

  const handleExportCurrent = () => {
    if (activeTab === 'roster') {
      exportSubReferralRosterToExcel(subNetwork, sbclCode);
      return;
    }
    const label =
      activeTab === 'direct'
        ? `${sbclCode}-direct-referrals`
        : activeTab === 'sub'
        ? `${sbclCode}-sub-referral-network`
        : `${sbclCode}-referrals`;
    exportReferralsListToExcel(displayedSignups, label, 'Referrals');
  };

  const handleExportSpecificSub = (code: string, name: string, referrals: CategorizedReferral[]) => {
    exportReferralsListToExcel(
      referrals,
      `${sbclCode}-${code}-referrals`,
      `${name.slice(0, 20)} Referrals`
    );
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
        Checking SBCL network access…
      </div>
    );
  }

  if (!user || (!isAdminAccess && assignedCode !== sbclCode)) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center px-4">
        <div className="max-w-md liquid-glass border border-white/10 rounded-3xl p-8 text-center">
          <Network className="mx-auto text-[#00CFFF] mb-4" size={38} />
          <h1 className="text-3xl mb-3 font-bold">Verified SBCL access only</h1>
          <p className="text-white/45 text-sm mb-6">
            You can access only the referral network assigned to your SBCL account.
          </p>
          <Link to="/auth" className="inline-flex bg-white text-black rounded-xl px-5 py-3 font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const fullAliasSlug = (sbclProfile?.alias_id || sbclProfile?.form_slug || sbclCode).toLowerCase().replace(/^@/, '');

  return (
    <div className="min-h-screen bg-[#070B14] pt-24 pb-16 px-4 sm:px-6 text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_5%,rgba(0,207,255,.12),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(124,58,237,.18),transparent_32%)]" />

      <main className="relative max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00CFFF]/10 border border-[#00CFFF]/25 text-[#00CFFF] text-xs font-semibold uppercase tracking-wider mb-3">
              <Network size={13} />
              <span>SBCL Workspace · {sbclCode}</span>
            </div>
            <h1 className="text-4xl sm:text-6xl text-white font-bold leading-none tracking-tight">
              Referral network
            </h1>
            <p className="text-white/50 mt-3 max-w-2xl text-sm sm:text-base leading-relaxed">
              Explore your complete referral tree: view all referrals referred directly by you, plus every referral referred from your sub-referral network. Filter by sub-referral team and export on demand.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {isAdminAccess && (
              <Link
                to="/admin"
                className="flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-xs sm:text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                ← Admin overview
              </Link>
            )}
            <button
              onClick={handleExportCurrent}
              disabled={loading || (activeTab !== 'roster' && !displayedSignups.length) || (activeTab === 'roster' && !subNetwork.length)}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white px-4 py-3 text-xs sm:text-sm font-semibold transition-all disabled:opacity-40"
              title="Download currently active view as Excel"
            >
              <Download size={15} /> Export current view
            </button>
            <button
              onClick={handleExportMaster}
              disabled={loading || !allSignups.length}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00CFFF] to-[#38BDF8] text-[#070B14] px-5 py-3 text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all disabled:opacity-40"
              title="Download comprehensive multi-tab Excel workbook"
            >
              <Download size={16} /> Export master network
            </button>
          </div>
        </header>

        {/* Workspace Navigation: Dashboard | Referral Network | Profile */}
        <SbclWorkspaceNav sbclCode={sbclCode} />

        {/* Top KPI Metrics Row */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-8">
          {[
            {
              label: 'Total network referrals',
              value: allSignups.length,
              icon: Users,
              color: '#00CFFF',
              desc: 'Direct + sub-referrals',
            },
            {
              label: 'Referred by you (Direct)',
              value: directSignups.length,
              icon: UserRound,
              color: '#A78BFA',
              desc: 'Attributed directly to SBCL',
            },
            {
              label: 'From sub-referrals',
              value: subReferralSignups.length,
              icon: Share2,
              color: '#F59E0B',
              desc: 'Referred by team members',
            },
            {
              label: 'Sub-referral partners',
              value: subNetwork.length,
              icon: Network,
              color: '#38BDF8',
              desc: 'Active sub-referrers',
            },
            {
              label: 'Network points earned',
              value: allSignups.length * 15,
              icon: Zap,
              color: '#34D399',
              desc: '15 points per signup',
            },
          ].map(({ label, value, icon: Icon, color, desc }) => (
            <div
              key={label}
              className="liquid-glass rounded-2xl p-5 border border-white/10 flex flex-col justify-between"
            >
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

        {/* Sub-Referral Network Summary Cards */}
        <section className="liquid-glass rounded-3xl border border-white/10 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-[#F59E0B]" />
                <h2 className="text-2xl font-bold">Sub-referral network teams</h2>
              </div>
              <p className="text-white/45 text-xs sm:text-sm mt-1">
                Each sub-referrer has their dedicated signup link. You can review and export their attributed signups below.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/join-team/${fullAliasSlug}`}
                target="_blank"
                className="text-xs text-[#00CFFF] hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Invite more sub-referrers</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {!subNetwork.length ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-black/20">
              <p className="text-white/40 text-sm">
                No sub-referrers active yet. Share your team invite link to onboard sub-referrers.
              </p>
              <Link
                to={`/join-team/${fullAliasSlug}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#00CFFF] hover:underline"
              >
                Open team signup page →
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subNetwork.map((member) => {
                const isSelected = selectedSubCode.toUpperCase() === member.code.toUpperCase();
                const formFullUrl =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/f/${member.code.toLowerCase()}`
                    : `/f/${member.code.toLowerCase()}`;

                return (
                  <div
                    key={member.code}
                    className={`rounded-2xl p-4 border transition-all ${
                      isSelected
                        ? 'border-[#00CFFF] bg-[#00CFFF]/5 shadow-lg shadow-cyan-500/10'
                        : 'border-white/10 bg-black/25 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate text-base">{member.name}</p>
                        <p className="font-mono text-xs text-[#F59E0B] mt-0.5">Code: {member.code}</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/50 font-medium">
                        {member.isRegistered ? 'Verified' : 'Attributed'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-black/30 border border-white/5">
                      <div>
                        <p className="text-lg font-bold text-white">{member.referralCount}</p>
                        <p className="text-[10px] text-white/40 uppercase">Valid referrals</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-400">{member.points}</p>
                        <p className="text-[10px] text-white/40 uppercase">Points</p>
                      </div>
                    </div>
                    {member.flaggedCount > 0 && (
                      <p className="text-[11px] text-amber-400/80 mb-2 font-mono">
                        ⚠ {member.flaggedCount} referral(s) flagged (0 pts)
                      </p>
                    )}

                    {/* Form Link Copy */}
                    <div className="flex items-center gap-1.5 mb-3 bg-black/40 rounded-xl p-1.5 border border-white/5">
                      <span className="text-[11px] font-mono text-[#00CFFF] truncate px-1 flex-1">
                        /f/{member.code.toLowerCase()}
                      </span>
                      <button
                        onClick={() => copy(formFullUrl, member.code)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all text-xs flex items-center gap-1"
                        title="Copy form link"
                      >
                        {copiedKey === member.code ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                        <span className="text-[10px]">{copiedKey === member.code ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs">
                      <button
                        onClick={() => {
                          setSelectedSubCode(isSelected ? 'all' : member.code);
                          if (activeTab === 'roster') setActiveTab('sub');
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all ${
                          isSelected
                            ? 'bg-[#00CFFF] text-black'
                            : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Viewing referrals' : 'View referrals'}
                      </button>
                      <button
                        onClick={() => handleExportSpecificSub(member.code, member.name, member.referrals)}
                        disabled={!member.referrals.length}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
                        title={`Export ${member.name}'s referrals to Excel`}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubReferral(member.code, member.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400/80 hover:text-red-300 hover:bg-red-500/20 transition-all"
                        title={`Delete ${member.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Interactive Referrals Explorer */}
        <section className="liquid-glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Tabs Bar */}
          <div className="p-5 sm:p-6 border-b border-white/10 bg-black/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Tab Switcher */}
              <div className="flex flex-wrap gap-1 p-1 bg-black/40 rounded-2xl border border-white/10 max-w-fit">
                <button
                  onClick={() => {
                    setActiveTab('all');
                    setSelectedSubCode('all');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'all'
                      ? 'bg-white text-black font-semibold shadow'
                      : 'text-white/55 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users size={14} />
                  <span>All referrals</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                    {allSignups.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('direct');
                    setSelectedSubCode('all');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'direct'
                      ? 'bg-[#A78BFA] text-black font-semibold shadow'
                      : 'text-white/55 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <UserRound size={14} />
                  <span>Referred by you (Direct)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                    {directSignups.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('sub');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'sub'
                      ? 'bg-[#F59E0B] text-black font-semibold shadow'
                      : 'text-white/55 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Share2 size={14} />
                  <span>Referred by sub-referrals</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                    {subReferralSignups.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('roster');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'roster'
                      ? 'bg-[#00CFFF] text-black font-semibold shadow'
                      : 'text-white/55 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Network size={14} />
                  <span>Sub-referrers roster</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                    {subNetwork.length}
                  </span>
                </button>
              </div>

              {/* Sub-referrer Dropdown (if viewing sub-referrals or all) */}
              {activeTab !== 'direct' && activeTab !== 'roster' && subNetwork.length > 0 && (
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-white/40" />
                  <select
                    value={selectedSubCode}
                    onChange={(e) => setSelectedSubCode(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-[#00CFFF]"
                  >
                    <option value="all">All sub-referrers ({subNetwork.length})</option>
                    {subNetwork.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name} ({m.referralCount} referrals)
                      </option>
                    ))}
                  </select>
                  {selectedSubCode !== 'all' && (
                    <button
                      onClick={() => setSelectedSubCode('all')}
                      className="text-xs text-[#00CFFF] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Search Bar */}
            {activeTab !== 'roster' && (
              <div className="mt-4 relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, AWS alias, Builder ID, or contact number…"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/35 outline-none focus:border-[#00CFFF] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Roster View Tab */}
          {activeTab === 'roster' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-black/30 text-left text-white/35 text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="p-4 pl-6">Rank</th>
                    <th className="p-4">Sub-referrer name</th>
                    <th className="p-4">Sub-referral code</th>
                    <th className="p-4">Signup form link</th>
                    <th className="p-4">Signups count</th>
                    <th className="p-4">Points earned</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!subNetwork.length && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-white/35">
                        No sub-referrers found. Share your team invite link to onboard leaders.
                      </td>
                    </tr>
                  )}
                  {subNetwork.map((member, index) => (
                    <tr
                      key={member.code}
                      className="border-t border-white/[.06] hover:bg-white/[.02] transition-colors"
                    >
                      <td className="p-4 pl-6 text-white/40 font-mono text-xs">#{index + 1}</td>
                      <td className="p-4 text-white font-medium">{member.name}</td>
                      <td className="p-4">
                        <span className="font-mono text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2 py-0.5 rounded-lg text-xs">
                          {member.code}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-[#00CFFF]">
                        <button
                          onClick={() => copy(member.link, `roster-${member.code}`)}
                          className="hover:underline flex items-center gap-1 text-left"
                        >
                          <span>{member.link}</span>
                          {copiedKey === `roster-${member.code}` ? (
                            <Check size={11} className="text-emerald-400" />
                          ) : (
                            <Copy size={11} className="text-white/40" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-lg font-bold text-white">{member.referralCount}</td>
                      <td className="p-4 text-emerald-400 font-semibold">{member.points} pts</td>
                      <td className="p-4 text-right pr-6 flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setActiveTab('sub');
                            setSelectedSubCode(member.code);
                          }}
                          className="text-xs text-[#00CFFF] hover:text-white transition-colors"
                        >
                          View referrals →
                        </button>
                        <button
                          onClick={() => handleDeleteSubReferral(member.code, member.name)}
                          className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-300 transition-colors"
                          title="Delete sub-referrer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Referrals Table Tab */
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="sticky top-0 bg-[#0B0F1A] text-left text-white/35 text-[10px] uppercase tracking-widest z-10 shadow-sm">
                  <tr>
                    <th className="p-4 pl-6">Participant</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">AWS Alias</th>
                    <th className="p-4">AWS Builder ID</th>
                    <th className="p-4">Attribution source</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Submitted</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && !displayedSignups.length && (
                    <tr>
                      <td colSpan={9} className="p-14 text-center text-white/35">
                        {searchQuery || selectedSubCode !== 'all'
                          ? 'No referral records match your filters.'
                          : `No signups found for this referral category.`}
                      </td>
                    </tr>
                  )}
                  {displayedSignups.map((user, index) => (
                    <tr
                      key={`${user.alias}-${index}`}
                      className="border-t border-white/[.06] hover:bg-white/[.02] transition-colors"
                    >
                      <td className="p-4 pl-6">
                        <p className="text-white font-medium">{user.name || '—'}</p>
                        {user.nameOnAws && (
                          <p className="text-[11px] text-white/35">AWS name: {user.nameOnAws}</p>
                        )}
                        {!user.isValid && user.flagReason && (
                          <p className="text-[11px] text-amber-400/80 font-normal">
                            ⚠ {user.flagReason}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-white/60 font-mono text-xs">{user.email || '—'}</td>
                      <td className="p-4 text-white/60 text-xs">{user.contact || '—'}</td>
                      <td className="p-4 font-mono text-[#00CFFF]">@{user.alias}</td>
                      <td className="p-4 text-xs">
                        {user.builderCentralId === 'NO' ? (
                          <span className="text-amber-400/80">Pending</span>
                        ) : user.builderCentralId ? (
                          <span className="text-emerald-400 font-medium">Recorded</span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {user.isDirect ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-[#A78BFA] text-xs font-medium">
                            <UserCheck size={12} />
                            <span>Direct (You)</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 text-xs text-[#F59E0B] font-medium">
                              <Share2 size={11} />
                              <span>{user.subReferralName}</span>
                            </span>
                            {user.subReferralCode && (
                              <span className="text-[10px] font-mono text-white/40">
                                Code: {user.subReferralCode}
                              </span>
                            )}
                          </div>
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
                      <td className="p-4 text-white/35 text-xs">
                        {user.submittedAt ? new Date(user.submittedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-4 text-right pr-6">
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
          )}

          {/* Table Footer with Counts */}
          <div className="p-4 bg-black/30 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-2">
            <span>
              Showing {activeTab === 'roster' ? subNetwork.length : displayedSignups.length} of{' '}
              {activeTab === 'roster'
                ? subNetwork.length
                : activeTab === 'direct'
                ? directSignups.length
                : activeTab === 'sub'
                ? subReferralSignups.length
                : allSignups.length}{' '}
              records
            </span>
            <span className="text-[11px] text-white/30">
              Live synchronized with Supabase & Builder Central submissions
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
