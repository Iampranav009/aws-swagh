import LeaderboardTable from '../components/LeaderboardTable';
import Sidebar from '../components/Sidebar';

export default function Leaderboard() {
  const userAlias = localStorage.getItem('aws_alias') || '';

  return (
    <div className="bg-[#0B0F1A] h-screen pt-[72px] relative overflow-hidden flex flex-col">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row flex-1 overflow-hidden w-full">
        <Sidebar userAlias={userAlias} />

        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00CFFF] rounded-full blur-[200px] opacity-[0.07] pointer-events-none" />

          <div className="flex-1 px-4 sm:px-6 w-full mb-8 relative z-10 pt-8 sm:pt-10 pb-28 md:pb-10">
            <div className="text-center mb-10 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-xl">
                Top{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]">
                  Builders
                </span>
              </h1>
              <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                Live rankings updated every 5 seconds. Refer peers and climb the board to win exclusive AWS gear!
              </p>
            </div>
            <LeaderboardTable />
          </div>
        </main>
      </div>
    </div>
  );
}
