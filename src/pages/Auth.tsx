import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthUI } from '../components/ui/auth-fuse';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const returnTo = new URLSearchParams(location.search).get('returnTo');

  const isSignup = false;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      const savedReturnTo = localStorage.getItem('auth_return_to');
      localStorage.removeItem('auth_return_to');
      if (returnTo?.startsWith('/') || savedReturnTo?.startsWith('/')) {
        navigate(returnTo?.startsWith('/') ? returnTo : savedReturnTo!, { replace: true });
        return;
      }
      if (localStorage.getItem('aws_alias')) {
        navigate('/dashboard', { replace: true });
      } else {
        setShowAliasModal(true);
      }
    }
  }, [user, authLoading, navigate, returnTo]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (returnTo?.startsWith('/')) {
        navigate(returnTo);
        return;
      }
      if (!localStorage.getItem('aws_alias')) {
        setShowAliasModal(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      if (returnTo?.startsWith('/')) localStorage.setItem('auth_return_to', returnTo);
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth` } });
      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) return setError('Enter your email first, then request a password reset.');
    setLoading(true); setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/reset-password` });
    setLoading(false);
    setError(resetError ? resetError.message : 'Password reset email requested. Check your inbox and spam folder.');
  };

  return (
    <>
      <AuthUI 
        isSignIn={!isSignup}
        allowSignUp={false}
        onSignIn={handleAuth}
        onSignUp={handleAuth}
        onGoogle={handleGoogle}
        emailProps={{ value: email, onChange: e => setEmail(e.target.value) }}
        passwordProps={{ value: password, onChange: e => setPassword(e.target.value) }}
        loading={loading}
        error={error}
        onBack={() => navigate('/')}
      />
      <button type="button" onClick={resetPassword} disabled={loading} className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/60 hover:text-white">Forgot or migrated password?</button>

      {showAliasModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="liquid-glass w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl relative">
            <h2 className="text-2xl font-bold text-foreground mb-2">AWS Alias Required</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Please enter your AWS Alias User ID to continue. If you don't have one, you can{' '}
              <a href="https://bit.ly/4cvi5S6" target="_blank" rel="noreferrer" className="text-white hover:underline font-medium">
                create one here
              </a>.
            </p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              let cleanAlias = alias.startsWith('@') ? alias.substring(1) : alias;
              if (cleanAlias.trim()) {
                localStorage.setItem('aws_alias', cleanAlias);
                setShowAliasModal(false);
                navigate('/dashboard');
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="modal-alias" className="block text-sm font-medium text-foreground mb-1">
                    AWS Alias User ID
                  </label>
                  <input
                    id="modal-alias"
                    type="text"
                    required
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="e.g. johndoe"
                    className="flex h-10 w-full rounded-md border border-white/20 bg-black/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-white/90 h-10 px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Save & Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
