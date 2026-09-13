import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { buildReferralCode, parseReferralCode } from '../lib/referrals';

const builderSignupUrl = import.meta.env.VITE_BUILDER_CENTER_SIGNUP_URL || 'https://bit.ly/4cvi5S6';
const googleFormUrl = import.meta.env.VITE_GOOGLE_FORM_URL || 'https://forms.gle/PGhwQvEUXNwWFJ7L7';

export default function Join() {
  const { referralCode = '' } = useParams();
  const parsed = parseReferralCode(referralCode);
  const code = buildReferralCode(parsed.sbclCode, parsed.subReferralCode);
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-[#070B14] pt-24 pb-16 px-4 text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,.22),transparent_38%)]" />
      <main className="relative max-w-2xl mx-auto">
        <div className="text-center mb-8"><p className="text-[#00CFFF] text-xs uppercase tracking-[.25em] mb-3">Referred signup · {code}</p><h1 className="text-5xl sm:text-6xl">Join AWS Builder Center</h1><p className="text-white/50 mt-4">Complete both steps so your signup is verified and attributed correctly.</p></div>
        <div className="flex items-center mb-6"><div className="w-9 h-9 rounded-full bg-[#7C3AED] flex items-center justify-center font-semibold">1</div><div className="h-px flex-1 bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]" /><div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${step === 2 ? 'bg-[#00CFFF] text-black' : 'bg-white/10 text-white/40'}`}>2</div></div>

        {step === 1 ? (
          <section className="liquid-glass rounded-3xl border border-white/10 p-7 sm:p-9">
            <ShieldCheck className="text-[#A78BFA] mb-5" size={34} /><h2 className="text-3xl mb-3">Create your Builder Center account</h2><p className="text-white/50 leading-relaxed">Open the official signup page, create or sign in to your account, then copy the AWS Alias ID and Builder Central ID shown in your profile.</p>
            <a href={builderSignupUrl} target="_blank" rel="noopener noreferrer" className="mt-7 w-full bg-white text-black rounded-xl px-5 py-3.5 flex items-center justify-center gap-2 font-semibold">Open Builder Center <ExternalLink size={16} /></a>
            <button onClick={() => setStep(2)} className="mt-3 w-full bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] rounded-xl px-5 py-3.5 flex items-center justify-center gap-2 font-semibold">I completed signup <ArrowRight size={16} /></button>
          </section>
        ) : (
          <section className="liquid-glass rounded-3xl border border-white/10 p-7 sm:p-9">
            <CheckCircle2 className="text-[#00CFFF] mb-5" size={34} /><h2 className="text-3xl mb-3">Submit your signup details</h2><p className="text-white/50 leading-relaxed mb-6">The form must collect name, email, phone number, AWS Alias ID, Builder Central ID, and the locked referral code <span className="font-mono text-[#00CFFF]">{code}</span>.</p>
            <a href={googleFormUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-gradient-to-r from-[#7C3AED] to-[#00CFFF] rounded-xl px-5 py-3.5 flex items-center justify-center gap-2 font-semibold">Open signup verification form <ExternalLink size={16} /></a>
            <p className="text-white/30 text-xs text-center mt-4">The Google Form prefill field IDs will be connected after the new form is created.</p>
          </section>
        )}
      </main>
    </div>
  );
}

