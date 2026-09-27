import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { acceptSbclInvite, loadSbclInvite, type SbclInvitePreview } from '../lib/invitations';

export default function SbclVerify() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const token = params.get('token') || '';
  const [invite, setInvite] = useState<SbclInvitePreview | null>(null);
  const [name, setName] = useState(() => localStorage.getItem('sbcl_invite_name') || '');
  const [aliasId, setAliasId] = useState(() => localStorage.getItem('sbcl_invite_alias') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError('This invitation URL is incomplete. Ask the administrator for a new link.'); setLoading(false); return; }
    loadSbclInvite(token).then(setInvite).catch((cause) => setError(cause instanceof Error ? cause.message : 'Invalid invitation link.')).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (user && !name) {
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      if (metaName) setName(metaName);
    }
  }, [user, name]);

  const googleSignIn = async () => {
    localStorage.setItem('sbcl_invite_name', name.trim());
    localStorage.setItem('sbcl_invite_alias', aliasId.trim());
    localStorage.setItem('auth_return_to', `${window.location.pathname}${window.location.search}`);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    if (oauthError) setError(oauthError.message);
  };

  const activate = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!user?.email || !invite) return setError('Sign in before activating this invitation.');
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) return setError(`This link belongs to ${invite.email}. Sign out and use that Google account.`);
    if (password && password.length < 8) return setError('Use at least 8 characters for the optional password.');
    if (password !== confirmPassword) return setError('The passwords do not match.');
    try {
      setLoading(true);
      if (password) {
        const { error: updateError } = await supabase.auth.updateUser({ password, data: { full_name: name.trim() } });
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
        if (updateError) throw updateError;
      }
      if (!aliasId.trim()) throw new Error('Enter your unique AWS Alias ID.');
      const accepted = await acceptSbclInvite(token, name, aliasId);
      localStorage.removeItem('sbcl_invite_name');
      localStorage.removeItem('sbcl_invite_alias');
      localStorage.setItem('sbcl_code', accepted.sbclCode);
      localStorage.setItem('aws_alias', aliasId.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      navigate(`/sbcl/${accepted.sbclCode}`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not activate this invitation.');
    } finally { setLoading(false); }
  };

  const inputClass = 'mt-2 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-[#00CFFF]';
  if (loading || authLoading) return <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center">Checking secure invitation…</div>;
  if (!invite) return <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center px-4"><div className="max-w-md liquid-glass rounded-3xl border border-red-400/20 p-8 text-center"><LockKeyhole className="mx-auto text-red-400 mb-4" /><h1 className="text-3xl mb-3">Invitation unavailable</h1><p className="text-white/50 text-sm">{error}</p></div></div>;

  return <div className="min-h-screen bg-[#070B14] pt-28 pb-16 px-4 text-white"><main className="max-w-md mx-auto liquid-glass rounded-3xl border border-white/10 p-8"><div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 text-[#A78BFA] flex items-center justify-center mb-6"><ShieldCheck /></div><p className="text-[#00CFFF] text-xs uppercase tracking-[.2em] mb-2">Private SBCL invitation · {invite.sbclCode}</p><h1 className="text-4xl mb-3">Activate your account</h1><p className="text-white/45 text-sm leading-relaxed mb-7">This one-time link is reserved for <span className="text-white/80">{invite.email}</span>. Your referral URL will combine the three-letter SBCL code with your unique AWS Alias ID.</p>{!user ? <div className="space-y-4"><div><label className="text-white/45 text-xs uppercase tracking-widest">Full name</label><input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Your full name" /></div><div><label className="text-white/45 text-xs uppercase tracking-widest">AWS Alias ID</label><input required value={aliasId} onChange={(e) => setAliasId(e.target.value)} className={inputClass} placeholder="e.g. 878099" /></div><p className="text-white/35 text-xs">Your direct referral code will be {invite.sbclCode}{aliasId.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'YOURALIAS'}.</p>{error && <p className="text-red-400 text-xs">{error}</p>}<button type="button" disabled={!name.trim() || !aliasId.trim()} onClick={googleSignIn} className="w-full rounded-xl bg-white text-black py-3.5 font-semibold disabled:opacity-40">Continue with invited Google account</button><Link to={`/auth?returnTo=${encodeURIComponent(`/sbcl/verify?token=${token}`)}`} className="block text-center text-xs text-white/50 hover:text-white">Already have a password account? Sign in</Link></div> : <form onSubmit={activate} className="space-y-4"><div><label className="text-white/45 text-xs uppercase tracking-widest">Signed in as</label><div className={`${inputClass} text-white/70`}>{user.email}</div></div><div><label className="text-white/45 text-xs uppercase tracking-widest">Full name</label><input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Your full name" /></div><div><label className="text-white/45 text-xs uppercase tracking-widest">AWS Alias ID</label><input required value={aliasId} onChange={(e) => setAliasId(e.target.value)} className={inputClass} placeholder="e.g. 878099" /><p className="text-white/35 text-xs mt-2">Referral code: <span className="font-mono text-[#00CFFF]">{invite.sbclCode}{aliasId.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'YOURALIAS'}</span></p></div><div><label className="text-white/45 text-xs uppercase tracking-widest">Create password <span className="normal-case tracking-normal">(optional)</span></label><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="At least 8 characters" autoComplete="new-password" /></div>{password && <div><label className="text-white/45 text-xs uppercase tracking-widest">Confirm password</label><input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Enter password again" autoComplete="new-password" /></div>}{error && <p className="text-red-400 text-xs">{error}</p>}<button disabled={loading} className="w-full mt-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] py-3.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 size={16} /> Activate invite and open dashboard</button></form>}</main></div>;
}
