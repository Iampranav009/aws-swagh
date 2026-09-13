import { useEffect, useMemo, useState } from 'react';
import { Download, MailPlus, Network, ShieldCheck, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { doc, getDoc } from 'firebase/firestore';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { deriveSbclCodeFromEmail, parseReferralCode } from '../lib/referrals';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { inviteSbcl } from '../lib/invitations';
import AdminSidebar from '../components/AdminSidebar';

const VERIFIED_ADMIN_EMAIL = 'pranavshindeji5001@gmail.com';

type AdminView = 'overview' | 'invitations' | 'activity' | 'signups' | 'network' | 'exports';

export default function AdminDashboard({ view = 'overview' }: { view?: AdminView }) {
  const { user } = useAuth();
  const { allUsers, loading } = useLeaderboard();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) { setCheckingRole(false); return; }
    // Authentication is still performed by Firebase. This only maps the
    // already-verified Firebase identity to the admin role.
    if (user.email?.toLowerCase() === VERIFIED_ADMIN_EMAIL) {
      setIsAdmin(true);
      setCheckingRole(false);
      return;
    }
    getDoc(doc(db, 'admins', user.uid))
      .then((snapshot) => setIsAdmin(snapshot.exists()))
      .catch(() => setIsAdmin(false))
      .finally(() => setCheckingRole(false));
  }, [user]);

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.email || !isAdmin) return;
    try {
      setSending(true); setInviteStatus('');
      const generatedCode = await inviteSbcl(inviteEmail, user.email);
      setInviteStatus(`Invitation sent to ${inviteEmail}. Reserved SBCL code: ${generatedCode}`);
      setInviteEmail('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setInviteStatus(
        message.toLowerCase().includes('permission')
          ? 'Firestore denied the invitation. Deploy firestore.rules to the swag-aws Firebase project, then try again.'
          : message.includes('auth/operation-not-allowed')
            ? 'Firebase account-setup links are disabled. Enable Authentication → Sign-in method → Email/Password and Email link, then resend the invitation.'
          : message || 'Could not send invitation.'
      );
    } finally { setSending(false); }
  };

  const attributed = useMemo(() => allUsers.filter((user) => parseReferralCode(user.referralCode).sbclCode.length === 3), [allUsers]);
  const sbcls = useMemo(() => {
    const map = new Map<string, typeof attributed>();
    attributed.forEach((user) => {
      const prefix = parseReferralCode(user.referralCode).sbclCode;
      map.set(prefix, [...(map.get(prefix) || []), user]);
    });
    return [...map.entries()].map(([code, users]) => ({
      code,
      users,
      direct: users.filter((user) => !parseReferralCode(user.referralCode).subReferralCode).length,
      subReferrers: new Set(users.map((user) => parseReferralCode(user.referralCode).subReferralCode).filter(Boolean)).size,
    })).sort((a, b) => b.users.length - a.users.length);
  }, [attributed]);

  if (checkingRole) return <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center">Checking admin access…</div>;
  if (!user || !isAdmin) return <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center px-4"><div className="max-w-md liquid-glass border border-white/10 rounded-3xl p-8 text-center"><ShieldCheck className="mx-auto text-orange-400 mb-4" size={36} /><h1 className="text-4xl mb-3">Admin access required</h1><p className="text-white/45 text-sm mb-6">Firebase verifies your login, and Firestore grants the admin role through the admins collection.</p><Link to="/auth?returnTo=/admin" className="inline-flex bg-white text-black rounded-xl px-5 py-3 font-semibold">Open staff sign in</Link></div></div>;

  const exportAll = () => {
    const rows = attributed.map((user) => {
      const source = parseReferralCode(user.referralCode);
      return {
        'SBCL Code': source.sbclCode,
        'Sub-referral': source.subReferralCode || 'Direct',
        Email: user.email || '',
        Username: user.name || '',
        'AWS Alias ID': user.rawAlias || user.alias,
        'Builder Central ID': user.builderCentralId || '',
        'Referral Code': user.referralCode,
      };
    });
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Signups');
    XLSX.writeFile(workbook, 'admin-referral-signups.xlsx');
  };

  const titles: Record<AdminView, [string, string]> = {
    overview: ['Program overview', 'Monitor performance and program-wide analytics.'],
    invitations: ['SBCL invitations', 'Invite and onboard campus leaders securely.'],
    activity: ['SBCL activity', 'Review the latest attributed activity across all teams.'],
    signups: ['Signup records', 'Inspect every signup collected by SBCLs and sub-referrers.'],
    network: ['Referral network', 'Compare SBCL teams, direct referrals, and sub-referral performance.'],
    exports: ['Data exports', 'Download program data in an Excel-ready format.'],
  };

  return (
    <div className="min-h-screen bg-[#070B14] pt-24 pb-16 px-4 sm:px-6 text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_5%,rgba(249,115,22,.13),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(124,58,237,.18),transparent_30%)]" />
      <div className="relative max-w-[1500px] mx-auto flex flex-col lg:flex-row gap-6">
      <AdminSidebar />
      <main className="flex-1 min-w-0">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div><p className="text-orange-400 text-xs font-semibold tracking-[.24em] uppercase mb-3">Admin control room</p><h1 className="text-4xl sm:text-6xl leading-none">{titles[view][0]}</h1><p className="text-white/50 mt-4">{titles[view][1]}</p></div>
        </header>

        {view === 'overview' && <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Active SBCLs', value: sbcls.length, icon: ShieldCheck, color: '#F97316' },
            { label: 'Attributed signups', value: attributed.length, icon: Users, color: '#00CFFF' },
            { label: 'Sub-referrers', value: sbcls.reduce((sum, item) => sum + item.subReferrers, 0), icon: Network, color: '#A78BFA' },
            { label: 'Program points', value: attributed.length * 15, icon: Zap, color: '#34D399' },
          ].map(({ label, value, icon: Icon, color }) => <div key={label} className="liquid-glass rounded-2xl p-5 border border-white/10"><Icon size={18} style={{ color }} className="mb-5" /><p className="text-3xl sm:text-4xl font-semibold">{loading ? '—' : value}</p><p className="text-white/40 text-xs mt-2">{label}</p></div>)}
        </section>}

        {view === 'invitations' && <section className="liquid-glass rounded-3xl border border-white/10 p-6 mb-6">
          <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-orange-400/10 text-orange-400 flex items-center justify-center"><MailPlus size={20} /></div><div><h2 className="text-2xl">Invite an SBCL</h2><p className="text-white/35 text-xs">Firebase sends a secure account-setup link. The SBCL verifies their email, adds their name, and creates a password.</p></div></div>
          <form onSubmit={sendInvite} className="grid md:grid-cols-[1fr_180px_auto] gap-3">
            <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="leader@college.edu" className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-400" />
            <div className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 font-mono text-orange-400 flex items-center">{deriveSbclCodeFromEmail(inviteEmail) || 'AUTO'}<span className="text-white/25 text-[10px] ml-2">AUTO-UNIQUE</span></div>
            <button disabled={sending} className="rounded-xl bg-orange-500 hover:bg-orange-400 text-white px-6 py-3 font-semibold disabled:opacity-50">{sending ? 'Sending…' : 'Send invitation'}</button>
          </form>
          {inviteStatus && <p className="text-sm text-white/60 mt-3">{inviteStatus}</p>}
        </section>}

        {view === 'network' && <section className="liquid-glass rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10"><h2 className="text-3xl">SBCL performance</h2><p className="text-white/35 text-xs mt-1">Automatically grouped by the first three characters of each referral code.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-white/35 text-[10px] uppercase tracking-widest bg-black/20"><tr><th className="p-4 pl-6">Rank</th><th className="p-4">SBCL code</th><th className="p-4">Signups</th><th className="p-4">Direct</th><th className="p-4">Sub-referrers</th><th className="p-4">Points</th><th className="p-4 text-right pr-6">Workspace</th></tr></thead>
              <tbody>
                {!loading && !sbcls.length && <tr><td colSpan={7} className="p-12 text-center text-white/35">No structured referral codes found yet.</td></tr>}
                {sbcls.map((sbcl, index) => <tr key={sbcl.code} className="border-t border-white/[.06]"><td className="p-4 pl-6 text-white/35">#{index + 1}</td><td className="p-4"><span className="font-mono text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2.5 py-1 rounded-lg">{sbcl.code}</span></td><td className="p-4 text-xl font-semibold">{sbcl.users.length}</td><td className="p-4 text-white/55">{sbcl.direct}</td><td className="p-4 text-white/55">{sbcl.subReferrers}</td><td className="p-4 text-emerald-400">{sbcl.users.length * 15}</td><td className="p-4 text-right pr-6"><Link to={`/sbcl/${sbcl.code}`} className="text-[#00CFFF] hover:text-white transition-colors">Open dashboard →</Link></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>}

        {(view === 'activity' || view === 'signups') && <section className="grid gap-6">
          {view === 'activity' && <div className="liquid-glass rounded-3xl border border-white/10 p-6">
            <h2 className="text-3xl">Recent activity</h2>
            <p className="text-white/35 text-xs mt-1 mb-5">Latest attributed records from the live Google Sheet.</p>
            <div className="space-y-3">
              {attributed.slice().reverse().slice(0, 10).map((record, index) => {
                const source = parseReferralCode(record.referralCode);
                return <div key={`${record.alias}-${index}`} className="flex items-start gap-3 p-3 rounded-xl bg-white/[.03] border border-white/[.06]"><div className="mt-1 w-2 h-2 rounded-full bg-emerald-400 shrink-0" /><div className="min-w-0"><p className="text-sm text-white truncate">{record.name || record.alias} joined under <span className="font-mono text-orange-400">{source.sbclCode}</span></p><p className="text-[11px] text-white/35 mt-1">{source.subReferralCode ? `Sub-referral ${source.subReferralCode}` : 'Direct SBCL signup'} · +15 points</p></div></div>;
              })}
              {!attributed.length && <p className="text-white/35 text-sm">No activity available yet.</p>}
            </div>
          </div>}

          {view === 'signups' && <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10"><h2 className="text-3xl">All signup records</h2><p className="text-white/35 text-xs mt-1">Admin-only view across every SBCL and sub-referrer.</p></div>
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full min-w-[760px] text-sm"><thead className="sticky top-0 bg-[#0b0f1a] text-left text-white/35 text-[10px] uppercase tracking-widest"><tr><th className="p-4 pl-6">Person</th><th className="p-4">Email</th><th className="p-4">AWS Alias</th><th className="p-4">Builder ID</th><th className="p-4">SBCL</th><th className="p-4">Source</th></tr></thead><tbody>{attributed.map((record, index) => { const source = parseReferralCode(record.referralCode); return <tr key={`${record.alias}-${index}`} className="border-t border-white/[.06]"><td className="p-4 pl-6 text-white">{record.name || '—'}</td><td className="p-4 text-white/45">{record.email || '—'}</td><td className="p-4 font-mono text-[#00CFFF]">@{record.alias}</td><td className="p-4 text-white/45">{record.builderCentralId || '—'}</td><td className="p-4 font-mono text-orange-400">{source.sbclCode}</td><td className="p-4 font-mono text-[#A78BFA]">{source.subReferralCode || 'DIRECT'}</td></tr>; })}</tbody></table>
            </div>
          </div>}
        </section>}

        {view === 'exports' && <section className="liquid-glass rounded-3xl border border-white/10 p-8 max-w-2xl"><Download size={28} className="text-orange-400 mb-5" /><h2 className="text-3xl">Master signup export</h2><p className="text-white/45 text-sm mt-2 mb-6">Download all attributed signups with SBCL code, sub-referral source, email, username, AWS Alias ID, Builder Central ID, and referral code.</p><button onClick={exportAll} disabled={!attributed.length} className="flex items-center gap-2 rounded-xl bg-white text-[#070B14] px-5 py-3 font-semibold disabled:opacity-40"><Download size={16} /> Export master Excel</button></section>}
      </main>
      </div>
    </div>
  );
}
