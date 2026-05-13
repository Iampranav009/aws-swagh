import { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Auth() {
  const [isSignup, setIsSignup] = useState(new URLSearchParams(useLocation().search).get('signup') === 'true');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [randomDigits] = useState(() => Math.floor(100 + Math.random() * 900).toString());
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (newName.trim()) {
      const letters = newName.replace(/[^a-zA-Z]/g, '').toUpperCase().padEnd(3, 'X').substring(0, 3);
      setAlias(`${letters}${randomDigits}`);
    } else {
      setAlias('');
    }
  };
  
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    let cleanAlias = alias.startsWith('@') ? alias.substring(1) : alias;

    try {
      if (isSignup) {
        if (!cleanAlias) throw new Error('Alias is required');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        localStorage.setItem('aws_alias', cleanAlias);
        // Alias is currently not saved to Firebase Auth profile, Dashboard will match by displayName.
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // For a full app, you would also need to prompt Google users for their AWS Alias if they are new
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-6 relative overflow-hidden pt-20">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7C3AED] rounded-full blur-[200px] opacity-[0.15] pointer-events-none" />
      
      <div className="liquid-glass w-full max-w-md p-8 sm:p-10 rounded-3xl border border-white/10 relative z-10 shadow-2xl">
        <div className="flex mb-8 border-b border-white/10">
          <button className={`flex-1 pb-4 text-sm font-semibold transition-all ${!isSignup ? 'text-[#00CFFF] border-b-2 border-[#00CFFF] drop-shadow-[0_0_8px_rgba(0,207,255,0.8)]' : 'text-white/50 hover:text-white/80'}`} onClick={() => {setIsSignup(false); setError('');}}>Login</button>
          <button className={`flex-1 pb-4 text-sm font-semibold transition-all ${isSignup ? 'text-[#00CFFF] border-b-2 border-[#00CFFF] drop-shadow-[0_0_8px_rgba(0,207,255,0.8)]' : 'text-white/50 hover:text-white/80'}`} onClick={() => {setIsSignup(true); setError('');}}>Sign Up</button>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {isSignup && (
            <>
              <div>
                <label className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2 block">Full Name</label>
                <input type="text" required value={name} onChange={handleNameChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2 block">Referral Code / AWS Alias (@username)</label>
                <input type="text" required value={alias} onChange={e=>setAlias(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all" placeholder="e.g. JOH123" />
              </div>
            </>
          )}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2 block">Email Address</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all" placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2 block">Password</label>
            <input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all" placeholder="••••••••" />
          </div>
          
          {error && <p className="text-red-400 text-sm text-center bg-red-400/10 p-3 rounded-lg border border-red-400/20 animate-in fade-in">{error}</p>}

          <button disabled={loading} type="submit" className="mt-2 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white font-medium py-3.5 rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">
          <span className="text-white/30 text-xs font-medium uppercase tracking-wider">Or</span>
        </div>
        
        <button onClick={handleGoogle} className="mt-8 w-full liquid-glass border border-white/10 text-white font-medium py-3.5 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
