import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Database, Download, Link2, Network, RefreshCw, Search, ShieldCheck, Trash2, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { usePrivateSignupRows } from '../hooks/useLeaderboard';
import { deriveSbclCodeFromEmail, parseReferralCode } from '../lib/referrals';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { inviteSbcl } from '../lib/invitations';
import AdminSidebar from '../components/AdminSidebar';

type AdminView = 'overview' | 'invitations' | 'activity' | 'signups' | 'forms' | 'network' | 'registry' | 'exports';

export default function AdminDashboard({ view = 'overview' }: { view?: AdminView }) {
  const { user, isAdmin, loading: authLoading, roleLoading } = useAuth();
  const checkingRole = authLoading || roleLoading;
  const { allUsers, loading, refresh } = usePrivateSignupRows();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedSbcl, setSelectedSbcl] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [subReferrals, setSubReferrals] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [registry, setRegistry] = useState<any[]>([]);
  const [registrySearch, setRegistrySearch] = useState('');
  const [registrySourceFilter, setRegistrySourceFilter] = useState('all');
  const [loadingRegistry, setLoadingRegistry] = useState(false);
  const [copied, setCopied] = useState('');
  const [realtimeActive, setRealtimeActive] = useState(false);

  const loadAdminData = async () => {
    try {
      const [profilesRes, subsRes, invitesRes] = await Promise.all([
        supabase.from('sbcl_profiles').select('*').order('created_at', { ascending: true }),
        supabase.from('sub_referrals').select('*').order('created_at', { ascending: false }),
        supabase.from('sbcl_invites').select('*').order('created_at', { ascending: false }),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (subsRes.data) setSubReferrals(subsRes.data);
      if (invitesRes.data) setInvites(invitesRes.data);
    } catch (err) {
      console.warn('Could not load admin data:', err);
    }
  };

  const loadRegistry = async () => {
    setLoadingRegistry(true);
    try {
      const { data, error } = await supabase
        .from('builder_alias_registry')
        .select('*')
        .order('alias', { ascending: true });
      if (!error && data) {
        setRegistry(data);
      }
    } catch (err) {
      console.warn('Could not load alias registry:', err);
    } finally {
      setLoadingRegistry(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    loadAdminData();

    // Supabase Realtime WebSocket subscription for live updates
    const channel = supabase
      .channel('admin_realtime_ws')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sbcl_invites' },
        (payload) => {
          console.log('[Realtime WS] sbcl_invites change:', payload.eventType);
          loadAdminData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sbcl_profiles' },
        (payload) => {
          console.log('[Realtime WS] sbcl_profiles change:', payload.eventType);
          loadAdminData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sub_referrals' },
        (payload) => {
          console.log('[Realtime WS] sub_referrals change:', payload.eventType);
          loadAdminData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sbcl_form_submissions' },
        (payload) => {
          console.log('[Realtime WS] sbcl_form_submissions change:', payload.eventType);
          loadAdminData();
          refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signups' },
        (payload) => {
          console.log('[Realtime WS] signups change:', payload.eventType);
          refresh();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeActive(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeActive(false);
        }
      });

    // 5-second polling interval as an unbreakable fallback
    const interval = setInterval(() => {
      loadAdminData();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isAdmin, refresh]);

  useEffect(() => {
    if (isAdmin && (view === 'registry' || view === 'overview')) {
      loadRegistry();
    }
  }, [isAdmin, view]);

  const handleDeleteSubReferral = async (code: string, name: string) => {
    if (!window.confirm(`Delete sub-referrer "${name}" (${code})?\nThis will permanently remove their dedicated link (/f/${code.toLowerCase()}).`)) {
      return;
    }
    try {
      const { error } = await supabase.rpc('delete_sub_referral', { p_code: code });
      if (error) {
        await supabase.from('sub_referrals').delete().ilike('code', code);
      }
      setSubReferrals((prev) => prev.filter((s) => s.code.toUpperCase() !== code.toUpperCase()));
      refresh();
    } catch (err: any) {
      alert(`Could not delete sub-referral: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteSubmission = async (record: any) => {
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

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.email || !isAdmin) return;
    try {
      setSending(true); setInviteStatus(''); setInviteLink('');
      const generated = await inviteSbcl(inviteEmail, user.id);
      setInviteStatus(`Invite created for ${inviteEmail}. Reserved SBCL code: ${generated.sbclCode}. Link expires in 7 days.`);
      setInviteLink(generated.inviteUrl);
      setInviteEmail('');
      loadAdminData();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setInviteStatus(
        message || 'Could not send invitation.'
      );
    } finally { setSending(false); }
  };

  const attributed = useMemo(() => allUsers.filter((user) => parseReferralCode(user.referralCode || '').sbclCode.length === 3 || user.sbclCode), [allUsers]);

  const sbcls = useMemo(() => {
    const signupsByCode = new Map<string, typeof attributed>();
    attributed.forEach((user) => {
      const prefix = user.sbclCode ? user.sbclCode.toUpperCase().slice(0, 3) : parseReferralCode(user.referralCode || '').sbclCode;
      signupsByCode.set(prefix, [...(signupsByCode.get(prefix) || []), user]);
    });

    const registeredCodes = new Set((profiles || []).map((p) => (p?.sbcl_code || '').toUpperCase()));
    const items = (profiles || []).map((p) => {
      const code = (p?.sbcl_code || '').toUpperCase();
      const users = signupsByCode.get(code) || [];
      const validUsers = users.filter((u) => u.isValid !== false);
      const direct = validUsers.filter((u) => {
        const sub = parseReferralCode(u.referralCode || '').subReferralCode;
        return !sub || sub === code || (u.referralCode || '').toUpperCase() === code;
      }).length;
      const subReferrersCount = (subReferrals || []).filter((s) => (s?.sbcl_code || '').toUpperCase() === code).length;
      return {
        code,
        name: p?.name || `SBCL ${code}`,
        email: p?.email || '',
        aliasId: p?.alias_id || code,
        formSlug: p?.form_slug || code.toLowerCase(),
        builderSignupUrl: p?.builder_signup_url || '',
        users,
        validUsers,
        flaggedCount: users.length - validUsers.length,
        direct,
        subReferrers: subReferrersCount,
        points: validUsers.length * 15,
      };
    });

    for (const [code, users] of signupsByCode.entries()) {
      if (!registeredCodes.has(code) && code) {
        const validUsers = users.filter((u) => u.isValid !== false);
        items.push({
          code,
          name: `SBCL ${code}`,
          email: '',
          aliasId: code,
          formSlug: code.toLowerCase(),
          builderSignupUrl: '',
          users,
          validUsers,
          flaggedCount: users.length - validUsers.length,
          direct: validUsers.filter((u) => !parseReferralCode(u.referralCode || '').subReferralCode).length,
          subReferrers: new Set(users.map((u) => parseReferralCode(u.referralCode || '').subReferralCode).filter(Boolean)).size,
          points: validUsers.length * 15,
        });
      }
    }

    return items.sort((a, b) => b.validUsers.length - a.validUsers.length);
  }, [attributed, profiles, subReferrals]);

  const nativeForms = useMemo(() => attributed.filter((user) => user.source === 'native-form'), [attributed]);
  const formSbclCodes = useMemo(() => [...new Set(nativeForms.map((user) => user.sbclCode || parseReferralCode(user.referralCode || '').sbclCode))].sort(), [nativeForms]);
  const visibleFormRows = useMemo(() => selectedSbcl ? nativeForms.filter((user) => (user.sbclCode || parseReferralCode(user.referralCode || '').sbclCode) === selectedSbcl) : nativeForms, [nativeForms, selectedSbcl]);

  const filteredRegistry = useMemo(() => {
    return registry.filter((item) => {
      const q = registrySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.alias || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.first_referred_by || '').toLowerCase().includes(q);
      const matchesSource =
        registrySourceFilter === 'all' || item.source === registrySourceFilter;
      return matchesSearch && matchesSource;
    });
  }, [registry, registrySearch, registrySourceFilter]);

  const exportAll = () => {
    const rows = attributed.map((user) => {
      const source = parseReferralCode(user.referralCode || '');
      return {
        'SBCL Code': source.sbclCode,
        'Referred By': user.referrerName || (source.subReferralCode ? `Sub-referrer ${source.subReferralCode}` : 'Direct SBCL'),
        Email: user.email || '',
        Username: user.name || '',
        'AWS Alias ID': user.rawAlias || user.alias,
        'Builder Central ID': user.builderCentralId || '',
      };
    });
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Signups');
    XLSX.writeFile(workbook, 'admin-referral-signups.xlsx');
  };

  const exportNativeForms = () => {
    const rows = visibleFormRows.map((record) => {
      const source = parseReferralCode(record.referralCode || '');
      return {
        'SBCL Code': source.sbclCode,
        'Referred By': record.referrerName || (source.subReferralCode ? `Sub-referrer ${source.subReferralCode}` : 'Direct SBCL'),
        Username: record.name,
        Email: record.email || '',
        'Contact Number': record.contact || '',
        'AWS Alias ID': record.rawAlias || record.alias,
        'Builder Central ID': record.builderCentralId || '',
        'Name on AWS': record.nameOnAws || '',
        'Submitted At': record.submittedAt || '',
      };
    });
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 24 }, { wch: 24 }, { wch: 20 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedSbcl ? `${selectedSbcl} Form Data` : 'All SBCL Form Data');
    XLSX.writeFile(workbook, selectedSbcl ? `${selectedSbcl}-form-data.xlsx` : 'all-sbcl-form-data.xlsx');
  };

  const exportRegistry = () => {
    const rows = filteredRegistry.map((item) => ({
      'AWS Alias ID': item.raw_alias || `@${item.alias}`,
      'Full Name': item.name || '',
      'Email Address': item.email || '',
      'Database Source': item.source === 'student_mega_sheet' ? 'Student Mega Sheet (Historical)' : 'Referral Form Submission',
      'First Referred By': item.first_referred_by || '—',
      'Added At': item.created_at || '',
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 26 }, { wch: 30 }, { wch: 32 }, { wch: 20 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ALICE ID Registry');
    XLSX.writeFile(workbook, 'alice-id-database-registry.xlsx');
  };

  const titles: Record<AdminView, [string, string]> = {
    overview: ['Program overview', 'Monitor performance and program-wide analytics.'],
    invitations: ['SBCL invitations', 'Invite and onboard campus leaders securely.'],
    activity: ['SBCL activity', 'Review the latest attributed activity across all teams.'],
    signups: ['Signup records', 'Inspect every signup collected by SBCLs and sub-referrers.'],
    forms: ['SBCL form data', 'Open each SBCL dataset in a row-and-column view or download it as Excel.'],
    network: ['Referral network', 'Compare SBCL teams, direct referrals, and sub-referral performance.'],
    registry: ['ALICE ID database', 'Inspect and search historical and newly registered AWS Alias IDs.'],
    exports: ['Data exports', 'Download program data in an Excel-ready format.'],
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-white/50">Checking admin access…</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center px-4">
        <div className="max-w-md liquid-glass border border-white/10 rounded-3xl p-8 text-center">
          <ShieldCheck className="mx-auto text-orange-400 mb-4" size={36} />
          <h1 className="text-4xl mb-3">Admin access required</h1>
          <p className="text-white/45 text-sm mb-6">Supabase verifies your login and database role before granting staff access.</p>
          <Link to="/auth?returnTo=/admin" className="inline-flex bg-white text-black rounded-xl px-5 py-3 font-semibold">
            Open staff sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] pt-24 pb-16 px-4 sm:px-6 text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_5%,rgba(249,115,22,.13),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(124,58,237,.18),transparent_30%)]" />
      <div className="relative max-w-[1500px] mx-auto flex flex-col lg:flex-row gap-6">
      <AdminSidebar />
      <main className="flex-1 min-w-0">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-orange-400 text-xs font-semibold tracking-[.24em] uppercase">Admin control room</p>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                realtimeActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${realtimeActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{realtimeActive ? 'Live WebSocket Active' : 'Connecting WebSocket…'}</span>
              </div>
            </div>
            <h1 className="text-4xl sm:text-6xl leading-none">{titles[view][0]}</h1>
            <p className="text-white/50 mt-4">{titles[view][1]}</p>
          </div>
          <button
            onClick={() => { loadAdminData(); refresh(); }}
            className="self-start lg:self-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
            title="Force refresh now"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync now</span>
          </button>
        </header>

        {view === 'overview' && (
          <div className="space-y-6">
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Active SBCLs', value: sbcls.length, icon: ShieldCheck, color: '#F97316' },
                { label: 'Valid signups', value: attributed.filter((u) => u.isValid !== false).length, icon: Users, color: '#00CFFF' },
                { label: 'Sub-referrers', value: sbcls.reduce((sum, item) => sum + item.subReferrers, 0), icon: Network, color: '#A78BFA' },
                { label: 'Program points', value: attributed.filter((u) => u.isValid !== false).length * 15, icon: Zap, color: '#34D399' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="liquid-glass rounded-2xl p-5 border border-white/10">
                  <Icon size={18} style={{ color }} className="mb-5" />
                  <p className="text-3xl sm:text-4xl font-semibold">{loading ? '—' : value}</p>
                  <p className="text-white/40 text-xs mt-2">{label}</p>
                </div>
              ))}
            </section>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link to="/admin/network" className="p-4 liquid-glass rounded-2xl border border-white/10 hover:border-orange-400/40 transition-all group">
                <Network size={20} className="text-[#A78BFA] mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-sm text-white">Referral Network</p>
                <p className="text-white/40 text-xs mt-0.5">{sbcls.length} SBCLs · {subReferrals.length} Sub-refs</p>
              </Link>
              <Link to="/admin/signups" className="p-4 liquid-glass rounded-2xl border border-white/10 hover:border-[#00CFFF]/40 transition-all group">
                <Users size={20} className="text-[#00CFFF] mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-sm text-white">Signup Records</p>
                <p className="text-white/40 text-xs mt-0.5">{attributed.length} Total Submissions</p>
              </Link>
              <Link to="/admin/registry" className="p-4 liquid-glass rounded-2xl border border-white/10 hover:border-emerald-400/40 transition-all group">
                <Database size={20} className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-sm text-white">ALICE ID Database</p>
                <p className="text-white/40 text-xs mt-0.5">{registry.length} Unique Aliases</p>
              </Link>
              <Link to="/admin/invitations" className="p-4 liquid-glass rounded-2xl border border-white/10 hover:border-orange-400/40 transition-all group">
                <Link2 size={20} className="text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-sm text-white">SBCL Invitations</p>
                <p className="text-white/40 text-xs mt-0.5">Invite new campus leaders</p>
              </Link>
            </div>

            {/* SBCL Performance Summary on Overview */}
            <section className="liquid-glass rounded-3xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">SBCL Teams Overview</h2>
                  <p className="text-white/35 text-xs mt-1">Campus leaders and performance summary.</p>
                </div>
                <Link to="/admin/network" className="text-xs text-orange-400 hover:text-orange-300 font-semibold">
                  View Full Network →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-[#0b0f1a] text-left text-white/35 text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="p-4 pl-6">Rank</th>
                      <th className="p-4">Campus / SBCL</th>
                      <th className="p-4">Code</th>
                      <th className="p-4">Signups</th>
                      <th className="p-4">Sub-referrers</th>
                      <th className="p-4">Points</th>
                      <th className="p-4 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!sbcls.length ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-white/35">
                          No SBCL teams found yet.
                        </td>
                      </tr>
                    ) : (
                      sbcls.slice(0, 5).map((sbcl, index) => (
                        <tr key={sbcl.code} className="border-t border-white/[.06]">
                          <td className="p-4 pl-6 text-white/40">#{index + 1}</td>
                          <td className="p-4 font-medium text-white">{sbcl.name}</td>
                          <td className="p-4 font-mono text-orange-400">{sbcl.code}</td>
                          <td className="p-4 font-semibold text-white">
                            {sbcl.validUsers.length}{' '}
                            {sbcl.flaggedCount > 0 && (
                              <span className="text-amber-400 text-xs font-normal">
                                ({sbcl.flaggedCount} flagged)
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-white/60">{sbcl.subReferrers}</td>
                          <td className="p-4 text-emerald-400 font-bold">{sbcl.points} pts</td>
                          <td className="p-4 text-right pr-6">
                            <Link to={`/sbcl/${sbcl.code}`} className="text-[#00CFFF] hover:underline text-xs">
                              Open →
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {view === 'invitations' && (
          <div className="space-y-6">
            <section className="liquid-glass rounded-3xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-orange-400/10 text-orange-400 flex items-center justify-center">
                  <Link2 size={20} />
                </div>
                <div>
                  <h2 className="text-2xl">Create an SBCL invite link</h2>
                  <p className="text-white/35 text-xs">Generate a private, one-time signup URL and share it directly with the invited person.</p>
                </div>
              </div>
              <form onSubmit={sendInvite} className="grid md:grid-cols-[1fr_180px_auto] gap-3">
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="leader@college.edu" className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-400" />
                <div className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 font-mono text-orange-400 flex items-center">{deriveSbclCodeFromEmail(inviteEmail) || 'AUTO'}<span className="text-white/25 text-[10px] ml-2">AUTO-UNIQUE</span></div>
                <button disabled={sending} className="rounded-xl bg-orange-500 hover:bg-orange-400 text-white px-6 py-3 font-semibold disabled:opacity-50">{sending ? 'Generating…' : 'Generate invite URL'}</button>
              </form>
              {inviteStatus && <p className="text-sm text-white/60 mt-3">{inviteStatus}</p>}
              {inviteLink && <div className="mt-4 flex flex-col sm:flex-row gap-2"><input readOnly value={inviteLink} className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/70" /><button type="button" onClick={() => navigator.clipboard.writeText(inviteLink)} className="rounded-xl border border-orange-400/30 text-orange-300 px-4 py-3 font-semibold flex items-center justify-center gap-2"><Copy size={16} /> Copy URL</button></div>}
            </section>

            {/* Invitations History Table */}
            <section className="liquid-glass rounded-3xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">All SBCL Invitations</h3>
                  <p className="text-white/35 text-xs mt-1">Track status of generated campus leader invitation links.</p>
                </div>
                <span className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 px-3 py-1 rounded-xl">
                  {invites.length} Invitations
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-white/35 text-[10px] uppercase tracking-widest bg-black/20">
                    <tr>
                      <th className="p-4 pl-6">Email</th>
                      <th className="p-4">Reserved Code</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!invites.length ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-white/35">No invitations generated yet.</td>
                      </tr>
                    ) : (
                      invites.map((inv) => (
                        <tr key={inv.email} className="border-t border-white/[.06]">
                          <td className="p-4 pl-6 font-medium text-white">{inv.email}</td>
                          <td className="p-4 font-mono text-orange-400">{inv.sbcl_code}</td>
                          <td className="p-4">
                            {inv.status === 'verified' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full font-medium">
                                <Check size={12} /> Activated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full font-medium">
                                Pending Activation
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-white/50 text-xs">
                            {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="p-4 text-white/40 text-xs">
                            {inv.invite_expires_at ? new Date(inv.invite_expires_at).toLocaleDateString('en-GB') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {view === 'network' && (
          <div className="space-y-6">
            {/* SBCL Performance Table */}
            <section className="liquid-glass rounded-3xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-3xl">SBCL performance</h2>
                  <p className="text-white/35 text-xs mt-1">Campus leader workspaces, direct links, and network totals.</p>
                </div>
                <span className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 px-3 py-1.5 rounded-xl font-medium">
                  {sbcls.length} Campus Leaders
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="text-left text-white/35 text-[10px] uppercase tracking-widest bg-black/20">
                    <tr>
                      <th className="p-4 pl-6">Rank</th>
                      <th className="p-4">Campus / SBCL Name</th>
                      <th className="p-4">Code</th>
                      <th className="p-4">Direct Form Link</th>
                      <th className="p-4">Signups</th>
                      <th className="p-4">Direct</th>
                      <th className="p-4">Sub-referrers</th>
                      <th className="p-4">Points</th>
                      <th className="p-4 text-right pr-6">Workspace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && !sbcls.length && (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-white/35">
                          No SBCL campus leaders found yet.
                        </td>
                      </tr>
                    )}
                    {sbcls.map((sbcl, index) => {
                      const slug = sbcl.aliasId || sbcl.formSlug || sbcl.code.toLowerCase();
                      const formUrl = `/f/${slug.toLowerCase().replace(/^@/, '')}`;
                      const avatarColors = [
                        'from-[#FF9900] to-[#FF5500]',
                        'from-[#7C3AED] to-[#4F46E5]',
                        'from-[#00CFFF] to-[#0077FF]',
                        'from-[#10B981] to-[#059669]',
                      ];
                      const avatarColor = avatarColors[index % avatarColors.length];

                      return (
                        <tr key={sbcl.code} className="border-t border-white/[.06] hover:bg-white/[.02] transition-colors">
                          <td className="p-4 pl-6 text-white/40 font-mono text-xs">#{index + 1}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${avatarColor} flex items-center justify-center font-bold text-xs text-white shadow-md shrink-0`}>
                                {sbcl.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white truncate">{sbcl.name}</p>
                                <p className="text-[11px] text-white/40 truncate">{sbcl.email || `${sbcl.code} Leader`}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2.5 py-1 rounded-lg text-xs font-semibold">
                              {sbcl.code}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[#00CFFF] text-xs truncate max-w-[130px]">{formUrl}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}${formUrl}`);
                                  setCopied(sbcl.code);
                                  setTimeout(() => setCopied(''), 1500);
                                }}
                                className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                title="Copy direct link"
                              >
                                {copied === sbcl.code ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-lg font-bold text-white">{sbcl.validUsers.length}</span>
                            {sbcl.flaggedCount > 0 && (
                              <span className="block text-[10px] text-amber-400 font-mono">
                                ({sbcl.flaggedCount} flagged)
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-white/60">{sbcl.direct}</td>
                          <td className="p-4 text-white/60">{sbcl.subReferrers}</td>
                          <td className="p-4 font-semibold text-emerald-400">{sbcl.points}</td>
                          <td className="p-4 text-right pr-6">
                            <Link to={`/sbcl/${sbcl.code}`} className="text-[#00CFFF] hover:underline text-xs font-medium inline-flex items-center gap-1">
                              Open dashboard →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Sub-Referral Network Roster Table with Delete */}
            <section className="liquid-glass rounded-3xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl">Sub-Referral Network Roster</h2>
                  <p className="text-white/35 text-xs mt-1">
                    All sub-referrers across all SBCL teams. Admin can delete sub-referrers here.
                  </p>
                </div>
                <span className="text-xs text-[#A78BFA] bg-[#7C3AED]/10 border border-[#7C3AED]/20 px-3 py-1.5 rounded-xl font-medium">
                  {subReferrals.length} Sub-Referrers
                </span>
              </div>
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="sticky top-0 bg-[#0b0f1a] text-left text-white/35 text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="p-4 pl-6">Sub-referrer Name</th>
                      <th className="p-4">Code / Alias</th>
                      <th className="p-4">SBCL</th>
                      <th className="p-4">Dedicated Form</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!subReferrals.length && (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-white/35">
                          No sub-referrers currently registered in the network.
                        </td>
                      </tr>
                    )}
                    {subReferrals.map((sub) => (
                      <tr key={sub.code} className="border-t border-white/[.06] hover:bg-white/[.02] transition-colors">
                        <td className="p-4 pl-6 font-medium text-white">{sub.name}</td>
                        <td className="p-4 font-mono text-[#00CFFF]">@{sub.code}</td>
                        <td className="p-4">
                          <span className="font-mono text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded text-xs">
                            {sub.sbcl_code}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs text-white/50">{sub.link || `/f/${sub.code.toLowerCase()}`}</td>
                        <td className="p-4 text-xs text-white/40">
                          {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button
                            onClick={() => handleDeleteSubReferral(sub.code, sub.name)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 text-xs transition-colors inline-flex items-center gap-1"
                            title="Delete this sub-referrer"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {(view === 'activity' || view === 'signups') && <section className="grid gap-6">
          {view === 'activity' && <div className="liquid-glass rounded-3xl border border-white/10 p-6">
            <h2 className="text-3xl">Recent activity</h2>
            <p className="text-white/35 text-xs mt-1 mb-5">Latest attributed records from the live database.</p>
            <div className="space-y-3">
              {attributed.slice().reverse().slice(0, 10).map((record, index) => {
                const source = parseReferralCode(record.referralCode);
                const code = record.sbclCode || source.sbclCode;
                const isValid = record.isValid !== false;
                return (
                  <div key={`${record.alias}-${index}`} className="flex items-start gap-3 p-3 rounded-xl bg-white/[.03] border border-white/[.06]">
                    <div className={`mt-1 w-2 h-2 rounded-full ${isValid ? 'bg-emerald-400' : 'bg-amber-400'} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">
                        {record.name || record.alias} joined under <span className="font-mono text-orange-400">{code}</span>
                      </p>
                      <p className="text-[11px] text-white/35 mt-1">
                        Referred by {record.referrerName || (source.subReferralCode ? `sub-referrer ${source.subReferralCode}` : 'the SBCL directly')} ·{' '}
                        {isValid ? (
                          <span className="text-emerald-400 font-medium">+15 points</span>
                        ) : (
                          <span className="text-amber-400 font-medium">0 pts (⚠ {record.flagReason || 'Flagged'})</span>
                        )}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteSubmission(record)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors shrink-0" title="Delete this record"><Trash2 size={13} /></button>
                  </div>
                );
              })}
              {!attributed.length && <p className="text-white/35 text-sm">No activity available yet.</p>}
            </div>
          </div>}

          {view === 'signups' && <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10"><h2 className="text-3xl">All signup records</h2><p className="text-white/35 text-xs mt-1">Admin-only view across every SBCL and sub-referrer.</p></div>
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="sticky top-0 bg-[#0b0f1a] text-left text-white/35 text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="p-4 pl-6">Person</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">AWS Alias</th>
                    <th className="p-4">Builder ID</th>
                    <th className="p-4">SBCL</th>
                    <th className="p-4">Referred By</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!attributed.length && <tr><td colSpan={8} className="p-10 text-center text-white/35">No signups found.</td></tr>}
                  {attributed.map((record, index) => {
                    const source = parseReferralCode(record.referralCode);
                    const code = record.sbclCode || source.sbclCode;
                    return (
                      <tr key={`${record.alias}-${index}`} className="border-t border-white/[.06]">
                        <td className="p-4 pl-6 text-white">
                          <p className="font-medium">{record.name || '—'}</p>
                          {!record.isValid && record.flagReason && (
                            <span className="block text-[11px] text-amber-400/80 font-normal">
                              ⚠ {record.flagReason}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-white/45">{record.email || '—'}</td>
                        <td className="p-4 font-mono text-[#00CFFF]">@{record.alias}</td>
                        <td className="p-4 text-white/45">{record.builderCentralId || '—'}</td>
                        <td className="p-4 font-mono text-orange-400">{code}</td>
                        <td className="p-4 text-[#A78BFA]">{record.referrerName || (source.subReferralCode ? `Sub-referrer ${source.subReferralCode}` : 'Direct SBCL')}</td>
                        <td className="p-4 text-xs">
                          {record.isValid !== false ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg">
                              ✓ Valid (+15)
                            </span>
                          ) : (record.flagReason || '').toLowerCase().includes('record') || (record.flagReason || '').toLowerCase().includes('sheet') ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg" title={record.flagReason}>
                              In DB Record (0)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-lg" title={record.flagReason}>
                              Duplicate (0)
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button onClick={() => handleDeleteSubmission(record)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors inline-flex items-center gap-1" title="Delete submission">
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>}
        </section>}

        {view === 'forms' && <section className="grid lg:grid-cols-[240px_1fr] gap-5">
          <aside className="liquid-glass rounded-3xl border border-white/10 p-4 h-fit"><button onClick={() => setSelectedSbcl('')} className={`w-full text-left rounded-xl px-4 py-3 text-sm mb-1 ${!selectedSbcl ? 'bg-orange-400/10 text-orange-300' : 'text-white/55 hover:bg-white/5'}`}>All SBCL forms <span className="float-right">{nativeForms.length}</span></button>{formSbclCodes.map((code) => <button key={code} onClick={() => setSelectedSbcl(code)} className={`w-full text-left rounded-xl px-4 py-3 text-sm mb-1 ${selectedSbcl === code ? 'bg-orange-400/10 text-orange-300' : 'text-white/55 hover:bg-white/5'}`}><span className="font-mono">{code}</span><span className="float-right">{nativeForms.filter((row) => (row.sbclCode || parseReferralCode(row.referralCode).sbclCode) === code).length}</span></button>)}</aside>
          <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden"><div className="p-5 border-b border-white/10 flex flex-col sm:flex-row gap-3 sm:items-center justify-between"><div><h2 className="text-2xl">{selectedSbcl || 'All SBCL'} submissions</h2><p className="text-white/35 text-xs mt-1">Native website forms · refresh every 3 seconds</p></div><button onClick={exportNativeForms} disabled={!visibleFormRows.length} className="rounded-xl bg-white text-black px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"><Download size={15}/> Download Excel</button></div><div className="overflow-auto max-h-[640px]"><table className="w-full min-w-[1100px] text-sm"><thead className="sticky top-0 bg-[#0b0f1a] text-left text-white/35 text-[10px] uppercase tracking-widest"><tr><th className="p-4">SBCL</th><th className="p-4">Username</th><th className="p-4">Email</th><th className="p-4">Contact</th><th className="p-4">AWS Alias</th><th className="p-4">Builder ID</th><th className="p-4">Referred By</th><th className="p-4">Status</th><th className="p-4">Submitted</th><th className="p-4 text-right pr-6">Action</th></tr></thead><tbody>{visibleFormRows.map((record, index) => { const source = parseReferralCode(record.referralCode); const code = record.sbclCode || source.sbclCode; return <tr key={`${record.alias}-${index}`} className="border-t border-white/[.06]"><td className="p-4 font-mono text-orange-400">{code}</td><td className="p-4 text-white"><p className="font-medium">{record.name}</p>{!record.isValid && record.flagReason && (<span className="block text-[11px] text-amber-400/80 font-normal">⚠ {record.flagReason}</span>)}</td><td className="p-4 text-white/50">{record.email}</td><td className="p-4 text-white/50">{record.contact}</td><td className="p-4 font-mono text-[#00CFFF]">@{record.alias}</td><td className="p-4 text-white/50">{record.builderCentralId || '—'}</td><td className="p-4 text-[#A78BFA]">{record.referrerName || (source.subReferralCode ? `Sub-referrer ${source.subReferralCode}` : 'Direct SBCL')}</td><td className="p-4 text-xs">{record.isValid !== false ? (<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg">✓ Valid (+15)</span>) : (record.flagReason || '').toLowerCase().includes('record') || (record.flagReason || '').toLowerCase().includes('sheet') ? (<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg" title={record.flagReason}>In DB Record (0)</span>) : (<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-lg" title={record.flagReason}>Duplicate (0)</span>)}</td><td className="p-4 text-white/35">{record.submittedAt ? new Date(record.submittedAt).toLocaleString() : '—'}</td><td className="p-4 text-right pr-6"><button onClick={() => handleDeleteSubmission(record)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors inline-flex items-center gap-1" title="Delete submission"><Trash2 size={13} /><span>Delete</span></button></td></tr>; })}{!visibleFormRows.length && <tr><td colSpan={10} className="p-12 text-center text-white/35">No native form submissions yet.</td></tr>}</tbody></table></div></div>
        </section>}

        {view === 'registry' && (
          <section className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="liquid-glass rounded-2xl p-5 border border-white/10">
                <Database size={18} className="text-[#00CFFF] mb-3" />
                <p className="text-3xl font-semibold">{registry.length}</p>
                <p className="text-white/40 text-xs mt-1">Total Unique ALICE IDs in Database</p>
              </div>
              <div className="liquid-glass rounded-2xl p-5 border border-white/10">
                <ShieldCheck size={18} className="text-amber-400 mb-3" />
                <p className="text-3xl font-semibold">
                  {registry.filter((r) => r.source === 'student_mega_sheet').length}
                </p>
                <p className="text-white/40 text-xs mt-1">Pre-existing Records (Mega Sheet)</p>
              </div>
              <div className="liquid-glass rounded-2xl p-5 border border-white/10">
                <Users size={18} className="text-emerald-400 mb-3" />
                <p className="text-3xl font-semibold">
                  {registry.filter((r) => r.source === 'referral_submission').length}
                </p>
                <p className="text-white/40 text-xs mt-1">New Referral Form Registrations</p>
              </div>
            </div>

            {/* Registry Search & Table */}
            <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">ALICE ID Registry</h2>
                  <p className="text-white/40 text-xs mt-1">
                    Every unique AWS Alias ID is tracked here. Any future referral matching these IDs is automatically flagged to prevent duplicates.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search alias, name, email..."
                      value={registrySearch}
                      onChange={(e) => setRegistrySearch(e.target.value)}
                      className="bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#00CFFF] w-56 sm:w-64"
                    />
                  </div>
                  <select
                    value={registrySourceFilter}
                    onChange={(e) => setRegistrySourceFilter(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 outline-none focus:border-[#00CFFF]"
                  >
                    <option value="all" className="bg-[#0B0F1A]">All Sources</option>
                    <option value="student_mega_sheet" className="bg-[#0B0F1A]">Historical Mega Sheet</option>
                    <option value="referral_submission" className="bg-[#0B0F1A]">Referral Submissions</option>
                  </select>
                  <button
                    onClick={exportRegistry}
                    disabled={!filteredRegistry.length}
                    className="rounded-xl bg-white text-black px-4 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:bg-white/90 transition-colors"
                  >
                    <Download size={13} />
                    <span>Download Excel</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="sticky top-0 bg-[#0b0f1a] text-left text-white/35 text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="p-4 pl-6">AWS Alias ID</th>
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Source</th>
                      <th className="p-4">Referred By</th>
                      <th className="p-4 pr-6">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRegistry ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-white/40">
                          Loading ALICE ID registry database...
                        </td>
                      </tr>
                    ) : !filteredRegistry.length ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-white/40">
                          No matching ALICE IDs found in database.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistry.map((item) => (
                        <tr
                          key={item.alias}
                          className="border-t border-white/[.06] hover:bg-white/[.02] transition-colors"
                        >
                          <td className="p-4 pl-6 font-mono text-[#00CFFF] font-medium">
                            {item.raw_alias || `@${item.alias}`}
                          </td>
                          <td className="p-4 text-white font-medium">{item.name || '—'}</td>
                          <td className="p-4 text-white/50">{item.email || '—'}</td>
                          <td className="p-4 text-xs">
                            {item.source === 'student_mega_sheet' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg">
                                Mega Sheet Record
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg">
                                Referral Submission
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-mono text-xs text-orange-400">
                            {item.first_referred_by || '—'}
                          </td>
                          <td className="p-4 pr-6 text-xs text-white/35">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {view === 'exports' && <section className="liquid-glass rounded-3xl border border-white/10 p-8 max-w-2xl"><Download size={28} className="text-orange-400 mb-5" /><h2 className="text-3xl">Master signup export</h2><p className="text-white/45 text-sm mt-2 mb-6">Download all attributed signups with SBCL code, referring person, email, username, AWS Alias ID, and Builder Central ID.</p><button onClick={exportAll} disabled={!attributed.length} className="flex items-center gap-2 rounded-xl bg-white text-[#070B14] px-5 py-3 font-semibold disabled:opacity-40"><Download size={16} /> Export master Excel</button></section>}
      </main>
      </div>
    </div>
  );
}
