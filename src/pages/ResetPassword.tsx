import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setMessage('Use at least 8 characters.');
    if (password !== confirm) return setMessage('The passwords do not match.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMessage(error.message);
    navigate('/dashboard', { replace: true });
  };
  return <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center px-4"><form onSubmit={submit} className="w-full max-w-md liquid-glass border border-white/10 rounded-3xl p-8 space-y-4"><h1 className="text-4xl">Choose a new password</h1><p className="text-white/45 text-sm">This also activates password login for an account migrated from Firebase.</p><input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3" /><input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3" />{message && <p className="text-sm text-orange-300">{message}</p>}<button className="w-full rounded-xl bg-white text-black py-3 font-semibold">Save password</button></form></div>;
}
