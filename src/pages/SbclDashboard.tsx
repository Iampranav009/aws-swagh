import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Copy, Download, Link2, Plus, Users, UserRoundCheck, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import { doc, getDoc } from 'firebase/firestore';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { buildReferralCode, buildReferralLink, getSbclSignups, parseReferralCode, sanitizeReferralPart } from '../lib/referrals';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { createSubReferralLinks, loadSubReferralLinks, type SubReferralLink } from '../lib/subReferrals';

export default function SbclDashboard() {
  const { sbclCode: routeCode = '' } = useParams();
  const { user } = useAuth();
  const sbclCode = sanitizeReferralPart(routeCode || localStorage.getItem('sbcl_code') || 'SBC', 3).padEnd(3, 'X');
  const { allUsers, loading } = useLeaderboard();
  const [subNames, setSubNames] = useState('');
  const [subLinks, setSubLinks] = useState<SubReferralLink[]>([]);
  const [generatorError, setGeneratorError] = useState('');
  const [copied, setCopied] = useState('');
  const [assignedCode, setAssignedCode] = useState('');
  const [isAdminAccess, setIsAdminAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!user) { setCheckingAccess(false); return; }
    Promise.all([getDoc(doc(db, 'sbclProfiles', user.uid)), getDoc(doc(db, 'admins', user.uid))])
      .then(([profile, admin]) => {
        setAssignedCode(profile.exists() ? sanitizeReferralPart(String(profile.data().sbclCode), 3) : '');
        setIsAdminAccess(user.email?.toLowerCase() === 'pranavshindeji5001@gmail.com' || admin.exists());
      })
      .catch(() => {
        setAssignedCode('');
        setIsAdminAccess(user.email?.toLowerCase() === 'pranavshindeji5001@gmail.com');
      })
      .finally(() => setCheckingAccess(false));
  }, [user]);

  useEffect(() => {
    if (!user || (!isAdminAccess && assignedCode !== sbclCode)) return;
    loadSubReferralLinks(sbclCode).then(setSubLinks).catch(() => setSubLinks([]));
  }, [user, isAdminAccess, assignedCode, sbclCode]);

  const signups = useMemo(() => getSbclSignups(allUsers, sbclCode), [allUsers, sbclCode]);
  const groups = useMemo(() => {
    const result = new Map<string, typeof signups>();
    signups.forEach((user) => {
      const key = parseReferralCode(user.referralCode).subReferralCode || 'DIRECT';
      result.set(key, [...(result.get(key) || []), user]);
    });
    return [...result.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [signups]);

  const directCode = buildReferralCode(sbclCode);
  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1600);
  };

  const generateBatch = async () => {
    const names = subNames.split(/[\n,]+/).map((name) => name.trim()).filter(Boolean);
    if (!user?.email || !names.length) return;
    try {
      setGeneratorError('');
      const records = await createSubReferralLinks(sbclCode, names, user.email);
      setSubLinks(records);
      setSubNames('');
    } catch (cause) {
      setGeneratorError(cause instanceof Error ? cause.message : 'Could not generate links.');
    }
  };

  const exportSignups = () => {
    const rows = signups.map((user) => ({
      Email: user.email || '',
      Username: user.name || '',
      'AWS Alias ID': user.rawAlias || user.alias,
      'Builder Central ID': user.builderCentralId || '',
      'Referral Code': user.referralCode,
      'Sub-referral': parseReferralCode(user.referralCode).subReferralCode || 'Direct',
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SBCL Signups');
    XLSX.writeFile(workbook, `${sbclCode}-signups.xlsx`);
  };

  if (checkingAccess) return <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center">Checking SBCL access…</div>;
  if (!user || (!isAdminAccess && assignedCode !== sbclCode)) return <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center px-4"><div className="max-w-md liquid-glass border border-white/10 rounded-3xl p-8 text-center"><h1 className="text-4xl mb-3">Verified SBCL access only</h1><p className="text-white/45 text-sm mb-6">Open the Firebase verification link sent to your invited email. Your account can access only its assigned SBCL dashboard.</p><Link to="/auth" className="inline-flex bg-white text-black rounded-xl px-5 py-3 font-semibold">Sign in</Link></div></div>;

  return (
    <div className="min-h-screen bg-[#070B14] pt-24 pb-16 px-4 sm:px-6 text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_5%,rgba(124,58,237,.18),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(0,207,255,.12),transparent_28%)]" />
      <main className="relative max-w-7xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[#00CFFF] text-xs font-semibold tracking-[.24em] uppercase mb-3">SBCL workspace · {sbclCode}</p>
            <h1 className="text-4xl sm:text-6xl text-white leading-none">Referral command center</h1>
            <p className="text-white/50 mt-4 max-w-2xl">Track every Builder Center signup attributed to your direct link and your sub-referral network.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {isAdminAccess && <Link to="/admin" className="flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60 hover:text-white">← Admin overview</Link>}
            <button onClick={exportSignups} disabled={!signups.length} className="flex items-center justify-center gap-2 rounded-xl bg-white text-[#070B14] px-5 py-3 text-sm font-semibold disabled:opacity-40"><Download size={16} /> Export Excel</button>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total signups', value: signups.length, icon: Users, color: '#00CFFF' },
            { label: 'Direct signups', value: groups.find(([key]) => key === 'DIRECT')?.[1].length || 0, icon: UserRoundCheck, color: '#A78BFA' },
            { label: 'Sub-referrers', value: groups.filter(([key]) => key !== 'DIRECT').length, icon: Link2, color: '#F59E0B' },
            { label: 'Points earned', value: signups.length * 15, icon: Zap, color: '#34D399' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="liquid-glass rounded-2xl p-5 border border-white/10">
              <Icon size={18} style={{ color }} className="mb-5" />
              <p className="text-3xl sm:text-4xl font-semibold">{loading ? '—' : value}</p>
              <p className="text-white/40 text-xs mt-2">{label}</p>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-[1.05fr_.95fr] gap-5 mb-6">
          <div className="liquid-glass rounded-3xl p-6 border border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Your direct signup link</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-[#00CFFF] font-mono text-sm truncate">{buildReferralLink(directCode)}</div>
              <button onClick={() => copy(buildReferralLink(directCode), 'direct')} className="px-4 py-3 rounded-xl bg-[#00CFFF]/15 text-[#00CFFF] border border-[#00CFFF]/25 flex items-center justify-center gap-2 text-sm">
                {copied === 'direct' ? <Check size={16} /> : <Copy size={16} />} {copied === 'direct' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-white/35 text-xs mt-3">Code <span className="text-white/70 font-mono">{directCode}</span> identifies signups collected directly by this SBCL.</p>
          </div>

          <div className="liquid-glass rounded-3xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4"><Plus size={16} className="text-[#A78BFA]" /><h2 className="text-2xl">Generate sub-referral links</h2></div>
            <textarea value={subNames} onChange={(e) => setSubNames(e.target.value)} placeholder={'Enter several names, one per line\nPriya\nRahul\nAisha'} rows={3} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#A78BFA] resize-none" />
            <button disabled={!subNames.trim()} onClick={generateBatch} className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] py-3 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"><Link2 size={16} /> Generate all links automatically</button>
            {generatorError && <p className="text-red-400 text-xs mt-2">{generatorError}</p>}
            <div className="mt-4 space-y-2 max-h-44 overflow-y-auto">{subLinks.map((item) => <div key={item.code} className="flex items-center gap-2 p-2.5 bg-black/20 rounded-lg"><div className="min-w-0 flex-1"><p className="text-xs text-white">{item.name}</p><p className="text-[10px] font-mono text-[#A78BFA] truncate">{item.code}</p></div><button onClick={() => copy(item.link, item.code)} className="p-2 text-[#00CFFF]">{copied === item.code ? <Check size={14} /> : <Copy size={14} />}</button></div>)}</div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[.72fr_1.28fr] gap-5">
          <div className="liquid-glass rounded-3xl p-6 border border-white/10">
            <h2 className="text-2xl mb-5">Sub-referral performance</h2>
            <div className="space-y-3">
              {!groups.length && <p className="text-white/40 text-sm">No attributed signups yet.</p>}
              {groups.map(([code, users], index) => (
                <div key={code} className="flex items-center justify-between p-3 rounded-xl bg-white/[.03] border border-white/[.06]">
                  <div><p className="font-mono text-sm text-white">{code}</p><p className="text-white/30 text-xs">#{index + 1} in your network</p></div>
                  <div className="text-right"><p className="text-xl font-semibold">{users.length}</p><p className="text-white/30 text-[10px]">{users.length * 15} points</p></div>
                </div>
              ))}
            </div>
          </div>

          <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center"><h2 className="text-2xl">Signup records</h2><span className="text-xs text-white/35">{isAdminAccess ? 'Admin private-detail view' : 'Google Sheet live data'}</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-white/35 text-[10px] uppercase tracking-widest bg-black/20"><tr><th className="p-4 pl-6">Name</th><th className="p-4">Email</th>{isAdminAccess && <th className="p-4">Phone</th>}<th className="p-4">AWS Alias</th><th className="p-4">Builder Central ID</th><th className="p-4">Source</th></tr></thead>
                <tbody>
                  {!loading && !signups.length && <tr><td colSpan={isAdminAccess ? 6 : 5} className="p-10 text-center text-white/35">No signups found for prefix {sbclCode}.</td></tr>}
                  {signups.map((user, index) => <tr key={`${user.alias}-${index}`} className="border-t border-white/[.06]"><td className="p-4 pl-6 text-white">{user.name || '—'}</td><td className="p-4 text-white/55">{user.email || '—'}</td>{isAdminAccess && <td className="p-4 text-white/55">{user.contact || '—'}</td>}<td className="p-4 font-mono text-[#00CFFF]">@{user.alias}</td><td className="p-4 text-white/55">{user.builderCentralId || '—'}</td><td className="p-4 font-mono text-[#A78BFA]">{parseReferralCode(user.referralCode).subReferralCode || 'DIRECT'}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
