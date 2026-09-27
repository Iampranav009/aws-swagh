import LeaderboardTable from '../components/LeaderboardTable';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

export default function Leaderboard() {
  const userAlias = localStorage.getItem('aws_alias') || '';

  return (
    <div className="bg-[#0B0F1A] min-h-screen md:h-screen pt-[72px] relative md:overflow-hidden flex flex-col">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row flex-1 md:overflow-hidden w-full">
        <Sidebar userAlias={userAlias} />

        <main className="flex-1 flex flex-col md:overflow-y-auto overflow-x-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00CFFF] rounded-full blur-[200px] opacity-[0.07] pointer-events-none" />

          <div className="flex-1 px-4 sm:px-6 w-full mb-8 relative z-10 pt-8 sm:pt-10 pb-28 md:pb-10">
            <div className="text-center mb-10 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[#00CFFF] text-xs font-semibold mb-4 tracking-wide shadow-sm">
                <span>🗓️ Applications Close: 30th October 2026 · Results: 3rd November 2026</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-xl">
                Top{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]">
                  Builders
                </span>
              </h1>
              <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                A new referral program starts today. New referrals update every 3 seconds and build a fresh ranking.
              </p>
            </div>
            <LeaderboardTable />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
