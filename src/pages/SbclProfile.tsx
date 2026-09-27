import { useEffect, useState } from 'react';
import { Check, Copy, Save, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sanitizeReferralPart } from '../lib/referrals';
import { buildSbclFormLink } from '../lib/sbclForms';
import { supabase } from '../lib/supabase';
import SbclWorkspaceNav from '../components/SbclWorkspaceNav';

export default function SbclProfile() {
  const { sbclCode: routeCode = '' } = useParams(); const code = sanitizeReferralPart(routeCode, 3); const { user } = useAuth(); const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    name: string;
    alias_id: string;
    referral_code: string;
    form_slug: string;
    builder_signup_url?: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from('sbcl_profiles')
        .select('name,alias_id,referral_code,form_slug,sbcl_code,builder_signup_url')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ]).then(([p, a]) => {
      setIsAdmin(Boolean(a.data));
      if (p.data && (a.data || p.data.sbcl_code === code)) setProfile(p.data);
      else if (!a.data) navigate('/auth', { replace: true });
    });
  }, [user, code, navigate]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    try {
      setSaving(true);
      setMessage('');
      const { data, error } = await supabase.rpc('update_my_sbcl_profile', {
        p_name: profile.name,
        p_alias_id: profile.alias_id,
        p_builder_signup_url: profile.builder_signup_url || null,
      });
      if (error) throw error;
      setProfile((current) => (current ? { ...current, ...data } : current));
      setMessage('Profile updated.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!user)
    return (
      <div className="min-h-screen bg-[#070B14] pt-28 text-white text-center">
        <Link to="/auth">Sign in</Link>
      </div>
    );
  if (!profile)
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-white/40">
        Loading SBCL profile…
      </div>
    );

  const formLink = buildSbclFormLink(profile.alias_id || profile.form_slug || code);
  const previewSlug = (profile.alias_id || profile.form_slug || code).toLowerCase().replace(/^@/, '');

  return (
    <div className="min-h-screen bg-[#070B14] pt-24 pb-16 px-4 sm:px-6 text-white">
      <main className="max-w-5xl mx-auto">
        <p className="text-[#00CFFF] text-xs uppercase tracking-[.22em] mb-3">
          SBCL workspace · {code}
        </p>
        <h1 className="text-5xl mb-6">Profile & signup form</h1>
        <SbclWorkspaceNav sbclCode={code} />
        <div className="grid lg:grid-cols-2 gap-5">
          <form onSubmit={save} className="liquid-glass rounded-3xl border border-white/10 p-7">
            <UserRound className="text-[#A78BFA] mb-5" />
            <h2 className="text-2xl mb-5">SBCL profile</h2>
            <label className="text-xs text-white/45 block">
              Name
              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="mt-2 mb-4 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none focus:border-[#A78BFA]"
              />
            </label>
            <label className="text-xs text-white/45 block">
              AWS Alias ID
              <input
                value={profile.alias_id || ''}
                onChange={(e) => setProfile({ ...profile, alias_id: e.target.value })}
                className="mt-2 mb-4 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-mono outline-none focus:border-[#A78BFA]"
              />
            </label>
            <label className="text-xs text-white/45 block">
              Builder Signup URL
              <input
                value={profile.builder_signup_url || ''}
                onChange={(e) => setProfile({ ...profile, builder_signup_url: e.target.value })}
                placeholder="https://bit.ly/4cvi5S6 or your official builder signup URL"
                className="mt-2 mb-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-sm text-[#00CFFF] outline-none focus:border-[#A78BFA]"
              />
              <span className="text-[11px] text-white/35 block mb-4">
                This URL will be shown in your dedicated referral form and shared with your sub-referral team.
              </span>
            </label>
            <div className="rounded-xl bg-black/20 border border-white/10 p-4 text-xs text-white/45">
              Referral code
              <br />
              <span className="font-mono text-[#00CFFF] text-sm">{profile.referral_code}</span>
            </div>
            {message && (
              <p
                className={`text-sm mt-3 ${
                  message.includes('updated') ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {message}
              </p>
            )}
            <button
              disabled={saving}
              className="mt-5 w-full rounded-xl bg-white text-black py-3 font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </form>

          <section className="liquid-glass rounded-3xl border border-white/10 p-7">
            <p className="text-[#00CFFF] text-xs uppercase tracking-widest mb-2">
              Your dedicated form
            </p>
            <h2 className="text-3xl">One short link</h2>
            <p className="text-white/45 text-sm mt-3">
              Every submission through this URL is automatically assigned to your SBCL dashboard.
            </p>
            <div className="mt-6 rounded-xl bg-black/25 border border-white/10 p-4 font-mono text-sm text-[#00CFFF] break-all">
              {formLink}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(formLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-xl bg-[#00CFFF]/15 border border-[#00CFFF]/25 text-[#00CFFF] py-3 flex items-center justify-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy link'}
              </button>
              <Link
                to={`/f/${previewSlug}`}
                target="_blank"
                className="rounded-xl border border-white/10 py-3 text-center text-white/65 hover:text-white hover:border-white/20 transition-all"
              >
                Preview form
              </Link>
            </div>
            {profile.builder_signup_url && (
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">Configured Builder Signup URL</p>
                <p className="font-mono text-xs text-[#00CFFF] truncate">{profile.builder_signup_url}</p>
              </div>
            )}
            {isAdmin && (
              <p className="text-white/30 text-xs mt-5">
                Admin preview mode. Profile changes are available only to the profile owner.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
