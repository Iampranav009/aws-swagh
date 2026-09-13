import { useState } from 'react';
import { EmailAuthProvider, isSignInWithEmailLink, linkWithCredential, signInWithEmailLink, updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { auth } from '../lib/firebase';
import { acceptSbclInvite } from '../lib/invitations';

export default function SbclVerify() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!isSignInWithEmailLink(auth, window.location.href)) return setError('This invitation link is invalid or has expired.');
    if (password.length < 6) return setError('Create a password with at least 6 characters.');
    if (password !== confirmPassword) return setError('The passwords do not match.');
    try {
      setLoading(true);
      const normalizedEmail = email.trim().toLowerCase();
      const credential = await signInWithEmailLink(auth, normalizedEmail, window.location.href);
      await linkWithCredential(credential.user, EmailAuthProvider.credential(normalizedEmail, password));
      await updateProfile(credential.user, { displayName: name.trim() });
      const invite = await acceptSbclInvite(credential.user.email || normalizedEmail, credential.user.uid);
      navigate(`/sbcl/${invite.sbclCode}`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification failed. Please request a new invitation.');
    } finally { setLoading(false); }
  };

  const inputClass = 'mt-2 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-[#00CFFF]';
  return <div className="min-h-screen bg-[#070B14] pt-28 pb-16 px-4 text-white"><main className="max-w-md mx-auto liquid-glass rounded-3xl border border-white/10 p-8"><div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 text-[#A78BFA] flex items-center justify-center mb-6"><ShieldCheck /></div><p className="text-[#00CFFF] text-xs uppercase tracking-[.2em] mb-2">SBCL invitation</p><h1 className="text-4xl mb-3">Create your SBCL account</h1><p className="text-white/45 text-sm leading-relaxed mb-7">The invitation verifies your email. Add your name and create a password before your dedicated dashboard is activated.</p><form onSubmit={verify} className="space-y-4"><div><label className="text-white/45 text-xs uppercase tracking-widest">Full name</label><input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Your full name" /></div><div><label className="text-white/45 text-xs uppercase tracking-widest">Invited email</label><div className="relative"><Mail size={16} className="absolute left-4 top-[29px] text-white/30" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} pl-11`} placeholder="leader@college.edu" /></div></div><div><label className="text-white/45 text-xs uppercase tracking-widest">Create password</label><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Minimum 6 characters" autoComplete="new-password" /></div><div><label className="text-white/45 text-xs uppercase tracking-widest">Confirm password</label><input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Enter password again" autoComplete="new-password" /></div>{error && <p className="text-red-400 text-xs">{error}</p>}<button disabled={loading} className="w-full mt-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] py-3.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">{loading ? 'Creating account…' : <><CheckCircle2 size={16} /> Create account and open dashboard</>}</button></form></main></div>;
}
