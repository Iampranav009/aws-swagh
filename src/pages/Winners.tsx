import { useState, useEffect, useCallback } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { Trophy, Award, Crown, Gift, Search, Medal, ArrowLeft, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import Footer from '../components/Footer';
import staticWinners from '../data/giveaway_winners.json';

interface StudentWinner {
  id: number;
  name: string;
  alias: string;
  round?: number;
}

export default function Winners() {
  const { leaderboard, loading } = useLeaderboard();
  
  const [giveawayWinners, setGiveawayWinners] = useState<StudentWinner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedWinner, setSelectedWinner] = useState<{
    name: string;
    alias: string;
    rank?: number;
    type: 'top5' | 'elite' | 'giveaway';
    round?: number;
  } | null>(null);

  const handleWinnerClick = useCallback((
    winner: { name: string; alias: string },
    type: 'top5' | 'elite' | 'giveaway',
    rankOrRound?: number
  ) => {
    setSelectedWinner({
      name: winner.name,
      alias: winner.alias,
      type,
      rank: type !== 'giveaway' ? rankOrRound : undefined,
      round: type === 'giveaway' ? rankOrRound : undefined,
    });

    const rank = type !== 'giveaway' ? rankOrRound : undefined;

    if (type === 'top5' && rank && rank <= 3) {
      // Massive celebratory confetti for top 3
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
    } else {
      // Normal single burst for others
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  }, []);


  // Load static giveaway winners (finalized and archived)
  useEffect(() => {
    setGiveawayWinners(staticWinners as StudentWinner[]);
  }, []);

  // Top 5 Main Winners (Referral Champions)
  const top5Winners = leaderboard.slice(0, 5);
  const firstUser = top5Winners[0];
  const secondUser = top5Winners[1];
  const thirdUser = top5Winners[2];
  const fourthUser = top5Winners[3];
  const fifthUser = top5Winners[4];




  const isTop5 = selectedWinner && selectedWinner.type === 'top5';
  const rank = isTop5 ? selectedWinner?.rank : null;
  // Modal styles based on rank
  let modalBgClass = "bg-[#0F1426]/90 border-white/10 shadow-[0_20px_50px_rgba(124,58,237,0.3)]";
  let topBarColorClass = "from-orange-500 via-[#7C3AED] to-cyan-500";
  let frameBorderClass = "border-[#7C3AED]/35 shadow-[0_0_25px_rgba(124,58,237,0.25)]";

  if (rank === 1) {
    modalBgClass = "bg-[#141209]/95 border-yellow-500/30 shadow-[0_25px_60px_rgba(250,204,21,0.35)]";
    topBarColorClass = "from-yellow-400 via-amber-500 to-yellow-600";
    frameBorderClass = "border-yellow-500/40 shadow-[0_0_30px_rgba(250,204,21,0.4)]";
  } else if (rank === 2) {
    modalBgClass = "bg-[#0F1115]/95 border-slate-400/30 shadow-[0_25px_60px_rgba(209,213,219,0.3)]";
    topBarColorClass = "from-gray-300 via-slate-400 to-gray-500";
    frameBorderClass = "border-slate-400/40 shadow-[0_0_30px_rgba(209,213,219,0.3)]";
  } else if (rank === 3) {
    modalBgClass = "bg-[#110E0B]/95 border-amber-600/30 shadow-[0_25px_60px_rgba(180,83,9,0.2)]";
    topBarColorClass = "from-amber-600 via-orange-700 to-amber-800";
    frameBorderClass = "border-amber-600/40 shadow-[0_0_30px_rgba(180,83,9,0.3)]";
  } else if (rank === 4 || rank === 5) {
    modalBgClass = "bg-[#0D111E]/95 border-cyan-500/20 shadow-[0_25px_60px_rgba(0,207,255,0.15)]";
    topBarColorClass = "from-cyan-500 via-teal-500 to-emerald-600";
    frameBorderClass = "border-cyan-500/30 shadow-[0_0_25px_rgba(0,207,255,0.2)]";
  }

  const goodiesImage = 
    rank === 1 ? "/swag/img-1st.png" :
    rank === 2 ? "/swag/img-2nd.png" :
    rank === 3 ? "/swag/img-3rd.png" :
    (rank === 4 || rank === 5) ? "/swag/4th-5th.png.png" :
    "/swag/winner_150.png.jpeg";

  return (
    <div className="bg-[#0B0F1A] min-h-screen pt-[72px] relative overflow-x-hidden flex flex-col items-center">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#7C3AED]/10 rounded-full filter blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-[#00CFFF]/5 rounded-full filter blur-[150px] pointer-events-none -z-10" />

      <div className="w-full max-w-5xl p-4 sm:p-6 lg:p-8 pb-28 md:pb-10 relative z-10">
        
        {/* Navigation back link */}
        <div className="mb-4">
          <Link 
            to="/leaderboard"
            className="inline-flex items-center gap-1 text-white/50 hover:text-white transition-all text-xs font-semibold"
          >
            <ArrowLeft size={14} /> Back to Leaderboard
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            🏆 Campaign{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00CFFF] via-[#7C3AED] to-orange-400">
              Winners Hall
            </span>
          </h1>
          <p className="text-white/50 text-xs sm:text-sm max-w-xl mx-auto mt-2 leading-relaxed">
            Celebrating our absolute top referral leaders and the lucky winners drawn from our AWS Builder community giveaway.
          </p>
        </div>

        {/* ── GOODIES CLAIM NOTICE (Responsive & Mobile Optimized) ── */}
        <section className="hidden md:flex w-full rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-orange-500/10 via-purple-600/10 to-transparent border border-white/10 shadow-xl flex-col md:flex-row items-stretch md:items-center justify-between gap-6 backdrop-blur-md mb-12">
          <div className="flex flex-col gap-2 min-w-0">
            <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-400 flex items-center gap-2">
              <Gift size={18} className="text-orange-400 animate-bounce" /> Goodies Claim &amp; Distribution Details
            </h3>
            <div className="text-xs text-white/70 space-y-2 leading-relaxed">
              <p>
                <strong>1. Leaderboard Top 5 Champions:</strong> Your custom AWS goodies will be shipped directly to your addresses within <strong>2 to 3 weeks</strong> (due to standard production manufacturing times).
              </p>
              <p>
                <strong>2. Lucky Giveaway 150 Winners:</strong> Your goodies will also be ready in <strong>2 to 3 weeks</strong>, but they are <strong>exclusively available for pickup on the JDIET College Campus</strong>. If you are an outside participant, you will need to collect them from the campus.
              </p>
              <p className="text-white/40 italic">
                * Details regarding pickup slots and reservations will be shared in our official group. Please join using the button.
              </p>
            </div>
          </div>
          <a
            href="https://chat.whatsapp.com/GAfhZWodmWy7DObGfVfJ1q"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm text-center transition-all shadow-[0_0_15px_rgba(22,163,74,0.4)] whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
          >
            Join WhatsApp Group 💬
          </a>
        </section>

        {/* ── SECTION 1: TOP 5 MAIN WINNERS (Referral Champions) ── */}
        <section className="mb-14">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Crown className="text-yellow-400 animate-pulse" size={24} />
            <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider">
              Referral Leaderboard Champions
            </h2>
          </div>

          {loading ? (
            <div className="flex flex-col md:flex-row items-end gap-6 max-w-4xl mx-auto animate-pulse">
              <div className="w-full md:w-1/3 h-44 bg-white/5 rounded-2xl" />
              <div className="w-full md:w-5/12 h-56 bg-white/5 rounded-2xl" />
              <div className="w-full md:w-1/3 h-40 bg-white/5 rounded-2xl" />
            </div>
          ) : top5Winners.length === 0 ? (
            <div className="liquid-glass p-8 text-center rounded-2xl border border-white/5 text-white/40 max-w-xl mx-auto">
              No data loaded yet. Rankings will appear shortly.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Glorified 3D Podium for Top 3 */}
              <div className="flex flex-col md:flex-row items-stretch md:items-end justify-center gap-6 max-w-4xl mx-auto w-full">
                
                {/* 2nd Place */}
                {secondUser && (
                  <div className="order-2 md:order-1 w-full md:w-1/3 flex flex-col justify-end">
                    <div 
                      className="relative p-6 rounded-2xl border border-slate-400/30 bg-gradient-to-b from-slate-400/5 to-transparent shadow-[0_0_20px_rgba(209,213,219,0.05)] hover:scale-[1.02] hover:border-slate-400/60 cursor-pointer transition-all flex flex-col justify-between overflow-hidden liquid-glass min-h-[190px]"
                      onClick={() => handleWinnerClick(secondUser, 'top5', 2)}
                    >
                      <div className="absolute top-4 right-4 w-9 h-9 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(209,213,219,0.4)]">
                        <Medal className="text-[#0B0F1A]" size={18} />
                      </div>
                      
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black mb-1">2nd Place</p>
                        <h3 className="text-lg font-black text-white truncate leading-snug">{secondUser.name}</h3>
                        <span className="inline-block text-[11px] font-mono text-[#00CFFF] bg-[#00CFFF]/10 border border-[#00CFFF]/20 px-2 py-0.5 rounded mt-2">
                          @{secondUser.alias}
                        </span>
                      </div>
                      
                      <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-white/40 uppercase font-semibold">Total Referrals</span>
                        <span className="text-sm font-black text-white">{secondUser.referrals} ({secondUser.points} pts)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {firstUser && (
                  <div className="order-1 md:order-2 w-full md:w-5/12">
                    <div 
                      className="relative p-8 rounded-3xl border border-yellow-500/50 bg-gradient-to-b from-yellow-500/10 to-transparent shadow-[0_0_40px_rgba(250,204,21,0.15)] hover:scale-[1.03] hover:border-yellow-400 cursor-pointer transition-all flex flex-col justify-between overflow-hidden liquid-glass min-h-[230px] border-b-8"
                      onClick={() => handleWinnerClick(firstUser, 'top5', 1)}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-2xl rounded-full" />
                      <div className="absolute top-5 right-5 w-12 h-12 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                        <Trophy className="text-[#0B0F1A] animate-bounce" size={24} />
                      </div>

                      <div>
                        <p className="text-yellow-400 text-xs uppercase tracking-widest font-black mb-1 flex items-center gap-1">
                          <Crown size={14} className="text-yellow-400 animate-pulse" /> 1st Place Champion
                        </p>
                        <h3 className="text-2xl font-black text-white truncate leading-tight mt-1">{firstUser.name}</h3>
                        <span className="inline-block text-xs font-mono text-[#00CFFF] bg-[#00CFFF]/10 border border-[#00CFFF]/20 px-3 py-1 rounded-lg mt-3">
                          @{firstUser.alias}
                        </span>
                      </div>

                      <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/40 uppercase font-black tracking-wider">Campaign Record</span>
                        <span className="text-base font-black text-yellow-400 glow-text">{firstUser.referrals} referrals ({firstUser.points} pts)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {thirdUser && (
                  <div className="order-3 md:order-3 w-full md:w-1/3 flex flex-col justify-end">
                    <div 
                      className="relative p-6 rounded-2xl border border-amber-700/30 bg-gradient-to-b from-amber-700/5 to-transparent shadow-[0_0_20px_rgba(180,83,9,0.05)] hover:scale-[1.02] hover:border-amber-600/60 cursor-pointer transition-all flex flex-col justify-between overflow-hidden liquid-glass min-h-[180px]"
                      onClick={() => handleWinnerClick(thirdUser, 'top5', 3)}
                    >
                      <div className="absolute top-4 right-4 w-9 h-9 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(180,83,9,0.4)]">
                        <Award className="text-[#0B0F1A]" size={18} />
                      </div>
                      
                      <div>
                        <p className="text-amber-500 text-[10px] uppercase tracking-widest font-black mb-1">3rd Place</p>
                        <h3 className="text-lg font-black text-white truncate leading-snug">{thirdUser.name}</h3>
                        <span className="inline-block text-[11px] font-mono text-[#00CFFF] bg-[#00CFFF]/10 border border-[#00CFFF]/20 px-2 py-0.5 rounded mt-2">
                          @{thirdUser.alias}
                        </span>
                      </div>
                      
                      <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-white/40 uppercase font-semibold">Total Referrals</span>
                        <span className="text-sm font-black text-white">{thirdUser.referrals} ({thirdUser.points} pts)</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Ranks 4 & 5 */}
              {(fourthUser || fifthUser) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full mt-4">
                  {fourthUser && (
                    <div 
                      className="liquid-glass border border-white/5 p-4 rounded-xl flex items-center justify-between hover:border-white/20 hover:bg-white/5 cursor-pointer transition-all"
                      onClick={() => handleWinnerClick(fourthUser, 'top5', 4)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60">#4</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{fourthUser.name}</p>
                          <p className="text-[10px] font-mono text-[#00CFFF]">@{fourthUser.alias}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white/50">{fourthUser.referrals} referrals</span>
                    </div>
                  )}

                  {fifthUser && (
                    <div 
                      className="liquid-glass border border-white/5 p-4 rounded-xl flex items-center justify-between hover:border-white/20 hover:bg-white/5 cursor-pointer transition-all"
                      onClick={() => handleWinnerClick(fifthUser, 'top5', 5)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60">#5</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{fifthUser.name}</p>
                          <p className="text-[10px] font-mono text-[#00CFFF]">@{fifthUser.alias}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white/50">{fifthUser.referrals} referrals</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>


        {/* ── SECTION 3: 150 GIVEAWAY WINNERS ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Gift className="text-orange-400 animate-bounce" size={20} />
              <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider">
                Giveaway Lucky Winners List
              </h2>
              <span className="px-2.5 py-0.5 bg-orange-500/15 border border-orange-500/30 rounded-full text-orange-400 text-[10px] font-semibold">
                {giveawayWinners.length} / 150 Drawn
              </span>
            </div>

            {/* Search box */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                size={14}
              />
              <input
                type="text"
                placeholder="Search winners by name or alias..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-1.5 bg-[#0a0d18] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 animate-all duration-300"
              />
            </div>
          </div>

          {giveawayWinners.length === 0 ? (
            <div className="liquid-glass border border-white/5 border-dashed p-10 text-center rounded-2xl text-white/40">
              <Gift className="mx-auto text-white/20 mb-3" size={32} />
              <p className="text-sm font-semibold">Giveaway draw not executed yet</p>
              <p className="text-xs text-white/30 mt-1">
                Winners will display here once the Giveaway page simulation has completed.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View: 3-column side-by-side (scrollbars hidden/removed completely) */}
              <div className="hidden md:grid grid-cols-3 gap-6">
                {[1, 2, 3].map(roundNum => {
                  const roundWinners = giveawayWinners.filter(w => w.round === roundNum);
                  const filteredRoundWinners = roundWinners.filter(w => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      (w.name || '').toLowerCase().includes(q) ||
                      (w.alias || '').toLowerCase().includes(q)
                    );
                  });
                  
                  return (
                    <div key={roundNum} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1 border-b border-white/5 pb-1.5">
                        <span className="text-xs font-bold tracking-wider uppercase text-white/50">Round {roundNum}</span>
                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
                          {roundNum === 1 ? '1 to 50' : roundNum === 2 ? '51 to 100' : '101 to 150'}
                        </span>
                      </div>
                      
                      <div 
                        className={`flex flex-col gap-2 p-3 rounded-2xl border min-h-[120px] ${
                          roundNum === 1 ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400' :
                          roundNum === 2 ? 'border-orange-500/20 bg-orange-500/5 text-orange-400' :
                          'border-purple-500/20 bg-purple-500/5 text-purple-400'
                        }`}
                      >
                        {filteredRoundWinners.length === 0 ? (
                          <span className="text-xs text-white/30 italic py-6 text-center">
                            {searchQuery.trim() ? 'No matches found' : 'Round winners will appear here once drawn...'}
                          </span>
                        ) : (
                          filteredRoundWinners.map((winner, idx) => {
                            const displayNum = (roundNum - 1) * 50 + idx + 1;
                            return (
                              <div
                                key={`${winner.alias}-${idx}`}
                                className="flex items-center gap-3 p-3.5 rounded-xl border border-white/5 bg-[#0D1222]/40 hover:border-[#7C3AED]/50 hover:bg-[#0D1222]/80 cursor-pointer transition-all text-sm font-semibold truncate group"
                                onClick={() => handleWinnerClick(winner, 'giveaway', roundNum)}
                              >
                                <span className="text-[#7C3AED] font-mono font-bold">{displayNum}.</span>
                                <span className="text-white group-hover:text-orange-400 transition-colors truncate">{winner.name}</span>
                                <span className="text-[#00CFFF] font-mono text-xs ml-auto shrink-0">@{winner.alias}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile View: Single vertical row list from 1 to 150 in a single column */}
              <div className="grid md:hidden grid-cols-1 gap-2.5">
                {giveawayWinners
                  .map((winner, idx) => ({ ...winner, originalIdx: idx }))
                  .filter(w => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      (w.name || '').toLowerCase().includes(q) ||
                      (w.alias || '').toLowerCase().includes(q)
                    );
                  })
                  .map((winner) => {
                    const displayNum = winner.originalIdx + 1;
                    return (
                      <div
                        key={`${winner.alias}-${winner.originalIdx}`}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-white/5 bg-[#0D1222]/40 hover:border-[#7C3AED]/50 hover:bg-[#0D1222]/80 cursor-pointer transition-all text-sm font-semibold truncate group"
                        onClick={() => handleWinnerClick(winner, 'giveaway', winner.round || 1)}
                      >
                        <span className="text-[#7C3AED] font-mono font-bold">{displayNum}.</span>
                        <span className="text-white group-hover:text-orange-400 transition-colors truncate">{winner.name}</span>
                        <span className="text-[#00CFFF] font-mono text-xs ml-auto shrink-0">@{winner.alias}</span>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </section>
      </div>
{/* Claim Swag Modal */}
      {selectedWinner && (
        <div 
          onClick={() => setSelectedWinner(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-3xl p-5 border text-center flex flex-col items-center gap-3.5 max-h-[92vh] overflow-y-auto scrollbar-hide animate-in fade-in zoom-in-95 duration-200 cursor-default transition-all duration-300 ${modalBgClass}`}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedWinner(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-1.5 rounded-full bg-white/5 hover:bg-white/10 z-10 transition-all"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            {/* Top ambient glow */}
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${topBarColorClass}`} />
            
            {/* Title & Info */}
            <div className="space-y-0.5 pt-1">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Claim Your Swag! 🎁</h3>
              <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00CFFF] to-[#7C3AED]">
                {selectedWinner.name} (@{selectedWinner.alias})
              </p>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/60">
                {selectedWinner.type === 'top5' && `Leaderboard Champion #${selectedWinner.rank}`}
                {selectedWinner.type === 'elite' && `Elite Builder Achiever #${selectedWinner.rank}`}
                {selectedWinner.type === 'giveaway' && `Lucky Giveaway Winner (Round ${selectedWinner.round})`}
              </div>
            </div>

            {/* Goodies Image — original large size */}
            <div className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-[2rem] border-4 p-1.5 bg-black/40 flex-shrink-0 group overflow-hidden my-1 transition-all duration-300 ${frameBorderClass}`}>
              <img 
                src={goodiesImage} 
                alt="AWS Swag Goodies Pack" 
                className="w-full h-full object-contain rounded-[1.7rem] transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Congratulations Text */}
            <div className="text-center font-black text-white text-base leading-snug px-2">
              🎉 Congratulations on winning this goodies!
            </div>

            {/* Instructions — compact */}
            <div className="text-xs text-white/70 text-left bg-black/40 border border-white/5 p-3 rounded-xl w-full leading-relaxed">
              <p className="font-semibold text-white text-[11px] flex items-center gap-1.5 border-b border-[#ffffff10] pb-1.5 mb-1.5">
                📋 Claim Details:
              </p>
              {isTop5 ? (
                <p className="text-[11px] text-[#00CFFF] font-medium leading-relaxed">
                  💡 Swag details will be emailed within 2–3 weeks. Keep an eye on your inbox.
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-[11px] leading-relaxed">🚀 Ready in <strong>2–3 weeks</strong> — pickup at <strong>JDIET Campus</strong> (outside participants visit campus).</p>
                  <p className="text-[11px] text-orange-400 font-medium">⚠️ Join the WhatsApp group below for pickup updates &amp; coordination.</p>
                </div>
              )}
            </div>

            {/* ── Mandatory WhatsApp Connection (Not for Top 5) ── */}
            {!isTop5 && (
              <div className="w-full mb-4">
                <a
                  href="https://chat.whatsapp.com/GAfhZWodmWy7DObGfVfJ1q"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:opacity-95 text-white font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.885a.5.5 0 0 0 .612.612l6.03-1.475A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 0 1-5.012-1.378l-.36-.214-3.732.912.933-3.62-.236-.372A9.761 9.761 0 0 1 2.182 12C2.182 6.574 6.574 2.182 12 2.182c5.426 0 9.818 4.392 9.818 9.818 0 5.426-4.392 9.818-9.818 9.818z"/>
                  </svg>
                  Connect on WhatsApp (Mandatory)
                </a>
              </div>
            )}

            {/* ── Get in Touch with Us ── */}
            <div className="w-full">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Connect on social media</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/aws_sbg_jdiet?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-2 liquid-glass rounded-xl py-3 px-2 border border-white/8 hover:border-white/20 hover:bg-white/5 transition-all duration-300 hover:-translate-y-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white/70 group-hover:text-white transition-colors duration-300 group-hover:scale-110">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                  <span className="text-white/60 text-[10px] font-medium group-hover:text-white/90 transition-colors">Instagram</span>
                </a>

                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/company/aws-student-builder-group-jdiet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-2 liquid-glass rounded-xl py-3 px-2 border border-white/8 hover:border-white/20 hover:bg-white/5 transition-all duration-300 hover:-translate-y-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/70 group-hover:text-white transition-colors duration-300 group-hover:scale-110">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="text-white/60 text-[10px] font-medium group-hover:text-white/90 transition-colors">LinkedIn</span>
                </a>

              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
