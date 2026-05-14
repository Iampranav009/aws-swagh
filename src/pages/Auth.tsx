import { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthUI } from '../components/ui/auth-fuse';

export default function Auth() {
  const [isSignup, setIsSignup] = useState(new URLSearchParams(useLocation().search).get('signup') === 'true');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [referral, setReferral] = useState('');
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignup) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        if (referral) {
          localStorage.setItem('aws_referral', referral);
        }
        setShowAliasModal(true);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        if (!localStorage.getItem('aws_alias')) {
          setShowAliasModal(true);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      if (!localStorage.getItem('aws_alias')) {
        setShowAliasModal(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <AuthUI 
        isSignIn={!isSignup}
        onToggleForm={() => { setIsSignup(!isSignup); setError(''); }}
        onSignIn={handleAuth}
        onSignUp={handleAuth}
        onGoogle={handleGoogle}
        emailProps={{ value: email, onChange: e => setEmail(e.target.value) }}
        passwordProps={{ value: password, onChange: e => setPassword(e.target.value) }}
        nameProps={{ value: name, onChange: e => setName(e.target.value) }}
        referralProps={{ value: referral, onChange: e => setReferral(e.target.value) }}
        loading={loading}
        error={error}
        onBack={() => navigate('/')}
      />

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
