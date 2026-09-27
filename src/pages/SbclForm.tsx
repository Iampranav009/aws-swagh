import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Gift, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { loadPublicSbclForm, submitSbclForm, type PublicSbclForm } from '../lib/sbclForms';

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/DEw9MvyogHH8OXj8Qce8d7';

function WhatsAppIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.456h.005c6.554 0 11.89-5.336 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-[#00CFFF] transition-colors';

export default function SbclForm() {
  const { formCode = '' } = useParams();
  const [form, setForm] = useState<PublicSbclForm | null>(null);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const [values, setValues] = useState({
    name: '',
    email: '',
    hasBuilderId: false,
    alias: '',
    contact: '',
    country: 'India',
  });

  useEffect(() => {
    loadPublicSbclForm(formCode)
      .then(setForm)
      .catch((cause) => setLoadError(cause instanceof Error ? cause.message : 'Form unavailable.'));
  }, [formCode]);

  const set = (key: keyof typeof values, value: string | boolean) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await submitSbclForm(formCode, {
        name: values.name,
        email: values.email,
        contact: values.contact,
        alias: values.alias,
        hasBuilderId: values.hasBuilderId,
        country: values.country,
      });
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit this form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#070B14] pt-28 px-4 text-white">
        <div className="max-w-lg mx-auto liquid-glass rounded-3xl border border-red-400/20 p-8 text-center">
          <h1 className="text-3xl font-bold">Form unavailable</h1>
          <p className="text-white/50 mt-3">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-white/40">
        Loading secure form…
      </div>
    );
  }

  if (complete) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center p-4 sm:p-6 text-white relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_15%,rgba(16,185,129,.14),transparent_45%),radial-gradient(circle_at_85%_75%,rgba(124,58,237,.16),transparent_35%)]" />

        <div className="relative max-w-lg w-full liquid-glass rounded-3xl border border-white/10 p-6 sm:p-9 text-center shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          {/* Subtle Top Accent Beam */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-[#00CFFF] to-[#7C3AED]" />

          {/* Green Tick mark in a clean glowing ring */}
          <div className="w-20 h-20 sm:w-22 sm:h-22 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center mb-5 shadow-[0_0_35px_rgba(52,211,153,0.3)]">
            <CheckCircle2 size={46} className="text-emerald-400" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles size={13} />
            Registration Confirmed
          </span>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1">
            You're all set!
          </h1>
          <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            Your AWS Builder registration has been recorded successfully and attributed to{' '}
            <span className="text-white font-medium">
              {form.sourceName || form.displayName || form.sbclCode}
            </span>.
          </p>

          {/* Official Builder Community short section */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left my-6">
            <div className="flex items-center gap-2 mb-1 text-white/90">
              <WhatsAppIcon size={16} className="text-[#25D366]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/80">
                Official Builder Community
              </h2>
            </div>
            <p className="text-white/50 text-xs leading-relaxed">
              Connect with fellow builders for updates on upcoming cloud challenges, workshops, and exclusive swags.
            </p>
          </div>

          {/* Action buttons: Left: Explore Swag, Right: Join WhatsApp Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Link
              to="/rewards"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium text-xs sm:text-sm transition-all"
            >
              <Gift size={16} className="text-[#A78BFA]" />
              <span>Explore Swag</span>
            </Link>

            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#25D366]/40 text-white hover:text-[#25D366] font-medium text-xs sm:text-sm transition-all"
            >
              <WhatsAppIcon size={16} className="text-[#25D366]" />
              <span>Join WhatsApp Group</span>
              <ExternalLink size={13} className="text-white/40" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] pt-12 sm:pt-16 pb-16 px-4 text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(0,207,255,.14),transparent_35%),radial-gradient(circle_at_10%_40%,rgba(124,58,237,.14),transparent_30%)]" />

      <main className="relative max-w-2xl mx-auto">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00CFFF]/20 bg-[#00CFFF]/10 px-4 py-2 text-xs text-[#00CFFF]">
            <ShieldCheck size={14} /> Verified SBCL Form · {form.sbclCode}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mt-4 tracking-tight">Builder signup</h1>
          <p className="text-white/50 mt-2.5 text-sm">
            This secure form was shared by <span className="text-white font-medium">{form.sourceName || form.displayName || form.sbclCode}</span>. Your referral is recorded automatically.
          </p>
        </div>

        <form onSubmit={submit} className="liquid-glass rounded-3xl border border-white/10 p-6 sm:p-9 grid sm:grid-cols-2 gap-4 shadow-2xl">
          {/* Full Name */}
          <label className="sm:col-span-2 text-xs font-medium text-white/60">
            Full Name <span className="text-red-400">*</span>
            <input
              required
              placeholder="e.g. Rahul Sharma"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>

          {/* Email ID */}
          <label className="text-xs font-medium text-white/60">
            Email ID <span className="text-red-400">*</span>
            <input
              required
              type="email"
              placeholder="rahul@example.com"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>

          {/* Contact Number */}
          <label className="text-xs font-medium text-white/60">
            Contact Number <span className="text-red-400">*</span>
            <input
              required
              placeholder="+91 9876543210"
              value={values.contact}
              onChange={(e) => set('contact', e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>

          {/* AWS Alias ID */}
          <label className="text-xs font-medium text-white/60">
            <div className="flex justify-between items-center">
              <span>AWS Alias ID / Username <span className="text-red-400">*</span></span>
              <a
                href={form.builderSignupUrl || 'https://bit.ly/4cvi5S6'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#00CFFF] hover:underline font-normal inline-flex items-center gap-1"
              >
                Sign up here <ExternalLink size={10} />
              </a>
            </div>
            <input
              required
              placeholder="@username"
              value={values.alias}
              onChange={(e) => set('alias', e.target.value)}
              className={`${inputClass} mt-2 font-mono`}
            />
          </label>

          {/* Country */}
          <label className="text-xs font-medium text-white/60">
            Country
            <input
              value={values.country}
              onChange={(e) => set('country', e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>

          {/* Builder ID Checkbox & Registration Link */}
          <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-4 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-white/80 font-medium">
                <input
                  type="checkbox"
                  checked={values.hasBuilderId}
                  onChange={(e) => set('hasBuilderId', e.target.checked)}
                  className="w-4 h-4 accent-[#00CFFF] rounded cursor-pointer"
                />
                <span>I have an AWS Builder ID</span>
              </label>
              {!values.hasBuilderId && (
                <a
                  href={form.builderSignupUrl || 'https://bit.ly/4cvi5S6'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00CFFF] hover:underline font-semibold inline-flex items-center gap-1"
                >
                  Don't have one? Sign up here <ExternalLink size={12} />
                </a>
              )}
            </div>

            {values.hasBuilderId ? (
              <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5 pl-7">
                <CheckCircle2 size={13} />
                Your Builder ID will be recorded with this submission.
              </p>
            ) : (
              <div className="mt-3.5 pt-3.5 border-t border-white/10 pl-1">
                <p className="text-xs text-white/60 mb-2.5">
                  Don't have an AWS Builder ID yet? Generate yours using the official SBCL signup link:
                </p>
                <a
                  href={form.builderSignupUrl || 'https://bit.ly/4cvi5S6'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00CFFF]/15 border border-[#00CFFF]/30 px-4 py-2 text-xs font-semibold text-[#00CFFF] hover:bg-[#00CFFF]/25 transition-all"
                >
                  <Sparkles size={13} />
                  Sign up for AWS Builder ID
                  <ExternalLink size={12} />
                </a>
                <p className="text-[11px] text-white/40 mt-2">
                  Once generated, copy your alias, enter it above, check the box, and submit your form.
                </p>
              </div>
            )}
          </div>

          <div className="sm:col-span-2 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 px-4 py-3 text-xs text-white/55">
            Attribution is automatic from this secure link. You do not need to enter or remember a referral code.
          </div>

          {error && <p className="sm:col-span-2 text-sm text-red-400">{error}</p>}

          <button
            disabled={submitting}
            className="sm:col-span-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] py-3.5 font-semibold text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 hover:opacity-95 transition-opacity"
          >
            {submitting ? 'Submitting…' : 'Submit signup'}
          </button>
        </form>
      </main>
    </div>
  );
}
