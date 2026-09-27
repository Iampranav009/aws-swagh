import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, ShieldCheck, ArrowRight, Sparkles, CheckCircle2, Lock, Mail, User, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { normalizeAlias } from '../lib/utils';

export default function SubReferralJoin() {
  const { sbclCode: rawCode = '' } = useParams();
  const cleanParam = normalizeAlias(rawCode);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [sbclInfo, setSbclInfo] = useState<{ name: string; sbcl_code: string; builder_signup_url?: string; alias_id?: string } | null>(null);
  const [loadingSbcl, setLoadingSbcl] = useState(true);
  const [sbclError, setSbclError] = useState('');

  // Form states
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alias, setAlias] = useState(localStorage.getItem('aws_alias') || '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!cleanParam) {
      setSbclError('Missing referral code or alias ID in URL.');
      setLoadingSbcl(false);
      return;
    }

    async function loadSbcl() {
      try {
        // 1. Try finding in sbcl_profiles (by alias_id, form_slug, or sbcl_code)
        let { data, error } = await supabase
          .from('sbcl_profiles')
          .select('name,sbcl_code,builder_signup_url,alias_id')
          .or(`sbcl_code.ilike.${cleanParam},form_slug.ilike.${cleanParam},alias_id.ilike.${cleanParam}`)
          .maybeSingle();

        // 2. If not found in sbcl_profiles, check if it's a sub_referral's alias
        if (!data) {
          const { data: subData } = await supabase
            .from('sub_referrals')
            .select('name,code,sbcl_code')
            .ilike('code', cleanParam)
            .maybeSingle();

          if (subData?.sbcl_code) {
            const { data: parentSbcl } = await supabase
              .from('sbcl_profiles')
              .select('name,sbcl_code,builder_signup_url,alias_id')
              .eq('sbcl_code', subData.sbcl_code)
              .maybeSingle();
            if (parentSbcl) {
              data = parentSbcl;
            }
          }
        }

        if (error || !data) {
          setSbclError('This referral link is not active or could not be found.');
        } else {
          setSbclInfo(data);
          localStorage.setItem('sub_referrer_sbcl', data.sbcl_code);
        }
      } catch {
        setSbclError('Could not verify referral link.');
      } finally {
        setLoadingSbcl(false);
      }
    }

    loadSbcl();
  }, [cleanParam]);

  // Auto-complete registration if user returns from Google OAuth
  useEffect(() => {
    if (!user || !sbclInfo || registered || submitting) return;
    const storedAlias = normalizeAlias(localStorage.getItem('aws_alias') || alias);
    const pendingOauth = localStorage.getItem('pending_sub_oauth');
    if (pendingOauth === 'true' && storedAlias) {
      localStorage.removeItem('pending_sub_oauth');
      setSubmitting(true);
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || storedAlias;
      (async () => {
        try {
          const { error: rpcErr } = await supabase.rpc('register_sub_referral', {
            p_sbcl_code: sbclInfo.sbcl_code,
            p_name: displayName,
            p_alias: storedAlias,
          });
          if (rpcErr) {
            console.warn('RPC register fallback after OAuth:', rpcErr);
            await supabase.from('sub_referrals').upsert({
              code: storedAlias,
              name: displayName,
              sbcl_code: sbclInfo.sbcl_code,
              link: `/f/${storedAlias.toLowerCase()}`,
              created_by: user.id,
              created_at: new Date().toISOString(),
            }, { onConflict: 'code' });
          }
        } catch (e) {
          console.error('Auto-registration error after OAuth:', e);
        } finally {
          localStorage.setItem('aws_alias', storedAlias);
          localStorage.setItem('sub_referrer_sbcl', sbclInfo.sbcl_code);
          setRegistered(true);
          setSubmitting(false);
          setTimeout(() => navigate('/dashboard'), 1200);
        }
      })();
    }
  }, [user, sbclInfo, registered, submitting, alias, navigate]);

  // If user is already logged in, check if we can register their alias directly
  const handleExistingUserJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !sbclInfo) return;

    const cleanAlias = normalizeAlias(alias);
    if (!cleanAlias) {
      setFormError('Please enter a valid AWS Alias ID.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const displayName = name.trim() || user.user_metadata?.full_name || user.user_metadata?.name || cleanAlias;
      const { error: rpcError } = await supabase.rpc('register_sub_referral', {
        p_sbcl_code: sbclInfo.sbcl_code,
        p_name: displayName,
        p_alias: cleanAlias,
      });

      if (rpcError) {
        console.warn('RPC register error, performing direct upsert:', rpcError);
        const { error: upsertErr } = await supabase.from('sub_referrals').upsert({
          code: cleanAlias,
          name: displayName,
          sbcl_code: sbclInfo.sbcl_code,
          link: `/f/${cleanAlias.toLowerCase()}`,
          created_by: user.id,
          created_at: new Date().toISOString(),
        }, { onConflict: 'code' });
        if (upsertErr) throw upsertErr;
      }

      localStorage.setItem('aws_alias', cleanAlias);
      localStorage.setItem('sub_referrer_sbcl', sbclInfo.sbcl_code);
      setRegistered(true);
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: any) {
      setFormError(err.message || 'Could not complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbclInfo) return;

    const cleanAlias = normalizeAlias(alias);
    if (!cleanAlias) {
      setFormError('Please enter a valid AWS Alias ID (e.g. rahul123).');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      if (mode === 'signup') {
        if (!name.trim()) {
          setFormError('Please enter your full name.');
          setSubmitting(false);
          return;
        }
        if (password.length < 8) {
          setFormError('Password must be at least 8 characters long.');
          setSubmitting(false);
          return;
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
          },
        });

        if (signUpError) throw signUpError;

        // Register sub-referral
        const { error: rpcErr } = await supabase.rpc('register_sub_referral', {
          p_sbcl_code: sbclInfo.sbcl_code,
          p_name: name.trim(),
          p_alias: cleanAlias,
        });

        if (rpcErr) {
          console.warn('RPC register error on signup:', rpcErr);
          await supabase.from('sub_referrals').upsert({
            code: cleanAlias,
            name: name.trim(),
            sbcl_code: sbclInfo.sbcl_code,
            link: `/f/${cleanAlias.toLowerCase()}`,
            created_by: authData?.user?.id || null,
            created_at: new Date().toISOString(),
          }, { onConflict: 'code' });
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;

        // Register / update sub-referral after sign in
        const { error: rpcErr } = await supabase.rpc('register_sub_referral', {
          p_sbcl_code: sbclInfo.sbcl_code,
          p_name: name.trim() || cleanAlias,
          p_alias: cleanAlias,
        });

        if (rpcErr) {
          console.warn('RPC register error on sign-in:', rpcErr);
          await supabase.from('sub_referrals').upsert({
            code: cleanAlias,
            name: name.trim() || cleanAlias,
            sbcl_code: sbclInfo.sbcl_code,
            link: `/f/${cleanAlias.toLowerCase()}`,
            created_by: signInData?.user?.id || null,
            created_at: new Date().toISOString(),
          }, { onConflict: 'code' });
        }
      }

      localStorage.setItem('aws_alias', cleanAlias);
      localStorage.setItem('sub_referrer_sbcl', sbclInfo.sbcl_code);
      setRegistered(true);
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: any) {
      setFormError(err.message || 'Authentication failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!sbclInfo) return;
    const cleanAlias = normalizeAlias(alias);
    if (!cleanAlias) {
      setFormError('Please enter your AWS Alias ID first before continuing with Google.');
      return;
    }
    localStorage.setItem('aws_alias', cleanAlias);
    localStorage.setItem('sub_referrer_sbcl', sbclInfo.sbcl_code);
    localStorage.setItem('pending_sub_oauth', 'true');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  };

  if (loadingSbcl || authLoading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-white/50">
        Loading sub-referral portal…
      </div>
    );
  }

  if (sbclError || !sbclInfo) {
    return (
      <div className="min-h-screen bg-[#070B14] pt-28 px-4 text-white">
        <div className="max-w-md mx-auto liquid-glass rounded-3xl border border-red-400/20 p-8 text-center">
          <h1 className="text-3xl font-bold">Invalid Link</h1>
          <p className="text-white/50 mt-3 text-sm">{sbclError || 'This referral link is not active.'}</p>
          <Link
            to="/auth"
            className="mt-6 inline-block rounded-xl bg-white text-black px-6 py-2.5 font-semibold text-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-[#070B14] pt-28 px-4 text-white">
        <div className="max-w-md mx-auto liquid-glass rounded-3xl border border-emerald-400/20 p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
          <h1 className="text-3xl font-bold">Welcome to the Team!</h1>
          <p className="text-white/60 mt-3 text-sm">
            You are now registered as a sub-referrer under{' '}
            <span className="text-[#00CFFF] font-semibold">{sbclInfo.name}</span>.
          </p>
          <p className="text-white/40 text-xs mt-2">Opening your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] pt-12 sm:pt-16 pb-16 px-4 text-white relative">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,.25),transparent_40%),radial-gradient(circle_at_90%_20%,rgba(0,207,255,.15),transparent_35%)]" />

      <main className="relative max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-2 text-xs text-[#A78BFA] font-medium mb-3">
            <Users size={14} /> Sub-Referral Network · {sbclInfo.sbcl_code}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Join {sbclInfo.name}
          </h1>
          <p className="text-white/50 text-sm mt-2 max-w-md mx-auto">
            Become a sub-referrer to get your personal AWS Builder campaign links and dedicated <span className="font-mono text-[#00CFFF]">/f/@alias</span> signup form.
          </p>
        </div>

        {/* Card */}
        <div className="liquid-glass rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl">
          {user ? (
            /* Logged in view */
            <form onSubmit={handleExistingUserJoin} className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#00CFFF] flex items-center justify-center font-bold text-sm">
                  {(user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/40">Logged in as</p>
                  <p className="text-sm font-semibold truncate text-white">{user.email}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 block mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00CFFF]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 block mb-1.5">
                  Your AWS Alias ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul123"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-[#00CFFF] outline-none focus:border-[#00CFFF]"
                />
                <p className="text-[11px] text-white/40 mt-1">
                  Your dedicated signup link will be:{' '}
                  <span className="font-mono text-[#00CFFF]">
                    {window.location.origin}/f/{normalizeAlias(alias).toLowerCase() || 'youralias'}
                  </span>
                </p>
              </div>

              {formError && <p className="text-red-400 text-xs">{formError}</p>}

              <button
                type="submit"
                disabled={submitting || !alias.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] font-semibold text-white flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Linking...' : 'Join Team & Open Dashboard'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            /* Guest / Signup view */
            <div>
              {/* Tab selector */}
              <div className="grid grid-cols-2 p-1 bg-black/40 rounded-xl border border-white/10 mb-6">
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white shadow'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'signin'
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white shadow'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="text-xs font-medium text-white/60 block mb-1.5">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#00CFFF]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-white/60 block mb-1.5">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="email"
                      required
                      placeholder="rahul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#00CFFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/60 block mb-1.5">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#00CFFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/60 block mb-1.5">
                    AWS Alias ID / Username <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. rahul123"
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-[#00CFFF] outline-none focus:border-[#00CFFF]"
                    />
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">
                    Your dedicated signup link will be:{' '}
                    <span className="font-mono text-[#00CFFF]">
                      /f/{normalizeAlias(alias).toLowerCase() || 'youralias'}
                    </span>
                  </p>
                </div>

                {formError && <p className="text-red-400 text-xs">{formError}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] font-semibold text-white flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 mt-2 shadow-lg shadow-purple-500/20"
                >
                  {submitting
                    ? 'Processing…'
                    : mode === 'signup'
                    ? 'Create Sub-Referrer Account'
                    : 'Sign In & Open Dashboard'}
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative px-3 bg-[#0B0F1A] text-xs text-white/40 uppercase">
                  or
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
          )}
        </div>

        {/* Benefits footer */}
        <div className="mt-8 grid grid-cols-2 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <Sparkles size={16} className="text-[#00CFFF] mb-2" />
            <p className="text-xs font-semibold text-white">Auto-attribution</p>
            <p className="text-[11px] text-white/40 mt-0.5">Every builder using your form link is credited directly to you.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <ShieldCheck size={16} className="text-[#A78BFA] mb-2" />
            <p className="text-xs font-semibold text-white">Earn Points</p>
            <p className="text-[11px] text-white/40 mt-0.5">15 points per verified signup towards official AWS Swag.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
