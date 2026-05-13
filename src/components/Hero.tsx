import { Link } from 'react-router-dom';
import { Gift, Trophy } from 'lucide-react';

const BG_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_230229_7c9bc431-46cf-489a-948d-e8144d8eb5d4.mp4';

export default function Hero() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <video
        className="absolute w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        src={BG_VIDEO}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B0F1A]/40 to-[#0B0F1A] z-10 pointer-events-none" />

      {/* ── Left content ── */}
      <div className="absolute bottom-0 left-0 z-20 px-6 sm:px-12 pb-16 sm:pb-24 max-w-2xl">
        {/* Giveaway badge */}
        <div className="mb-5 inline-flex items-center gap-2 liquid-glass rounded-full px-4 py-2">
          <Gift size={15} className="text-[#FF9900]" />
          <span className="text-[#FF9900] text-xs sm:text-sm font-semibold tracking-widest uppercase">
            AWS Goodies Giveaway
          </span>
        </div>

        <h1 className="text-white text-4xl sm:text-5xl lg:text-7xl font-semibold leading-tight tracking-tight mb-6 drop-shadow-2xl">
          Build. Refer.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9900] to-[#00CFFF]">
            Win Big.
          </span>
        </h1>

        <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-8 max-w-lg drop-shadow">
          Refer your peers, climb the leaderboard, and unlock exclusive AWS goodies.
          Every referral brings you one step closer to the top.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/auth?signup=true"
            className="liquid-glass flex items-center gap-2 text-white text-sm sm:text-base font-semibold px-8 py-3.5 rounded-full hover:bg-white/10 hover:shadow-[0_0_24px_rgba(255,153,0,0.25)] transition-all"
          >
            <Trophy size={17} />
            Join the Referral Programme
          </Link>
          <a
            href="#goodies"
            className="liquid-glass text-white/80 text-sm sm:text-base font-medium px-8 py-3.5 rounded-full hover:bg-white/10 hover:text-white transition-all"
          >
            🎁 See Goodies
          </a>
        </div>
      </div>

      {/* ── Right info card ── */}
      <div className="absolute bottom-0 right-0 z-20 hidden md:flex flex-col justify-end px-10 pb-16 sm:pb-24 max-w-xs text-right">
        <div className="liquid-glass rounded-2xl px-6 py-5 space-y-2">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">About Us</p>
          <p className="text-white text-sm leading-relaxed">
            AWS Student Builder Group at JDIET — a community of curious minds exploring cloud, AI, and emerging tech together.
          </p>
          <p className="text-white/50 text-xs leading-relaxed">
            We learn, build, and grow — one project at a time.
          </p>
        </div>
      </div>
    </div>
  );
}
