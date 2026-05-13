import { useLeaderboard } from '../hooks/useLeaderboard';
import { Trophy } from 'lucide-react';

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0"><Trophy className="text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" size={15} /></div>;
  if (rank === 2) return <div className="w-7 h-7 rounded-full bg-gray-300/20 flex items-center justify-center shrink-0"><Trophy className="text-gray-300 drop-shadow-[0_0_6px_rgba(209,213,219,0.8)]" size={15} /></div>;
  if (rank === 3) return <div className="w-7 h-7 rounded-full bg-amber-600/20 flex items-center justify-center shrink-0"><Trophy className="text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" size={15} /></div>;
  return <span className="text-white/40 font-mono text-sm w-7 text-center shrink-0">{rank}</span>;
};

export default function LeaderboardTable() {
  const { leaderboard, loading } = useLeaderboard();

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto liquid-glass rounded-3xl p-6 border border-white/5 shadow-2xl">
        <div className="animate-pulse flex flex-col gap-3">
          <div className="h-10 bg-white/5 rounded-lg w-full mb-2" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-white/5 rounded-xl w-full" />
          ))}
        </div>
      </div>
    );
  }

  const rows = leaderboard.slice(0, 20);

  return (
    <div className="w-full max-w-4xl mx-auto liquid-glass rounded-3xl overflow-hidden border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">

      {/* ── Desktop Table (md+) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-black/20 text-white/50 text-xs uppercase tracking-wider">
              <th className="p-4 pl-8 font-semibold w-20">Rank</th>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Alias ID</th>
              <th className="p-4 font-semibold text-right pr-8">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="p-10 text-center text-white/50 text-sm">No data available</td></tr>
            ) : (
              rows.map((user, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-white/5 transition-colors hover:bg-white/5 ${isTop3 ? 'bg-gradient-to-r from-[#7C3AED]/10 to-transparent' : ''}`}
                  >
                    <td className="p-4 pl-8">
                      <RankIcon rank={rank} />
                    </td>
                    <td className="p-4 text-white font-medium text-sm">{user.name}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#00CFFF]/10 text-[#00CFFF] text-xs font-mono border border-[#00CFFF]/20">
                        @{user.alias}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-8">
                      <span className={`text-base font-bold ${isTop3 ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]' : 'text-white'}`}>
                        {user.points}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Card List (< md) ── */}
      <div className="md:hidden">
        {/* Header */}
        <div className="grid grid-cols-[32px_1fr_auto_52px] gap-2 px-4 py-3 bg-black/30 border-b border-white/10 text-white/40 text-[9px] uppercase tracking-widest font-semibold">
          <span>#</span>
          <span>Name</span>
          <span>Alias</span>
          <span className="text-right">Pts</span>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-white/50 text-sm">No data available</div>
        ) : (
          rows.map((user, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            return (
              <div
                key={idx}
                className={`grid grid-cols-[32px_1fr_auto_52px] gap-2 items-center px-4 py-3.5 border-b border-white/5 ${isTop3 ? 'bg-gradient-to-r from-[#7C3AED]/10 to-transparent' : 'hover:bg-white/5'} transition-colors`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  <RankIcon rank={rank} />
                </div>

                {/* Name */}
                <p className="text-white text-sm font-medium truncate">{user.name}</p>

                {/* Alias */}
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#00CFFF]/10 text-[#00CFFF] text-[10px] font-mono border border-[#00CFFF]/20 truncate max-w-[100px]">
                  @{user.alias}
                </span>

                {/* Points */}
                <p className={`text-right text-sm font-bold ${isTop3 ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]' : 'text-white'}`}>
                  {user.points}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
