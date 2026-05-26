import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Gift, Award, RotateCcw, AlertTriangle, ArrowRight, Loader2, Trophy, ArrowUpRight } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';

interface Student {
  id: number;
  name: string;
  alias: string;
  round?: number;
}

// Web Audio API helper for sound synthesis
const playSound = (type: 'tick' | 'reveal' | 'fanfare' | 'blaster') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'reveal') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'fanfare') {
      const chords = [261.63, 329.63, 392.00, 523.25];
      chords.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8 + index * 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.1);
        osc.stop(ctx.currentTime + 0.8 + index * 0.1);
      });
    } else if (type === 'blaster') {
      const duration = 1.5;
      const osc = ctx.createOscillator();
      const gainOsc = ctx.createGain();
      const gainNoise = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.5);
      
      gainOsc.gain.setValueAtTime(0.25, ctx.currentTime);
      gainOsc.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + duration);
      
      gainNoise.gain.setValueAtTime(0.35, ctx.currentTime);
      gainNoise.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gainOsc);
      gainOsc.connect(ctx.destination);
      
      noiseSource.connect(filter);
      filter.connect(gainNoise);
      gainNoise.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      
      noiseSource.start();
      noiseSource.stop(ctx.currentTime + duration);
    }
  } catch (e) {
    console.error("Audio Context failed", e);
  }
};

export default function Giveaway() {
  const { leaderboard, allUsers, loading: dataLoading } = useLeaderboard();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [winners, setWinners] = useState<Student[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [scrollingName, setScrollingName] = useState<string>('Ready to Roll?');
  const [scrollingAlias, setScrollingAlias] = useState<string>('@alias');
  
  // Modal states
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [modalRound, setModalRound] = useState<number>(1);


  // References for keeping track of selections
  const animationTimerRef = useRef<any | null>(null);

  // Process live data into student pool with authenticity shortlisting
  useEffect(() => {
    if (dataLoading || allUsers.length === 0) return;

    // Identify top 5 performers to exclude
    const top5Aliases = new Set(leaderboard.slice(0, 5).map(u => u.alias.toUpperCase()));

    // Compute duplicates across the entire spreadsheet to catch double submissions
    const contactCounts: Record<string, number> = {};
    const aliasCounts: Record<string, number> = {};
    allUsers.forEach(u => {
      const contact = (u.contact || '').trim();
      if (contact && contact.length > 5) {
        contactCounts[contact] = (contactCounts[contact] || 0) + 1;
      }
      const alias = (u.alias || '').trim().toUpperCase();
      if (alias) {
        aliasCounts[alias] = (aliasCounts[alias] || 0) + 1;
      }
    });

    // Helper for matching sheet name with official AWS profile name
    const nameMatches = (sheetName: string, awsName: string): boolean => {
      if (!awsName) return true; // fallback if AWS name is not retrieved
      const cleanSheet = sheetName.toLowerCase().trim();
      const cleanAws = awsName.toLowerCase().trim();
      if (cleanSheet === cleanAws) return true;

      const sheetWords = cleanSheet.split(/\s+/).filter(w => w.length >= 3);
      const awsWords = cleanAws.split(/\s+/).filter(w => w.length >= 3);

      if (sheetWords.length === 0 || awsWords.length === 0) {
        return cleanSheet.includes(cleanAws) || cleanAws.includes(cleanSheet);
      }

      return sheetWords.some(sw => awsWords.some(aw => aw.includes(sw) || sw.includes(aw)));
    };

    // Main shortlisting selector function
    const getShortlist = (sliceSize: number) => {
      const candidates = allUsers.slice(0, sliceSize);
      const authenticPool: Student[] = [];

      candidates.forEach((u) => {
        // Exclude the top 5 leaderboard champions
        if (top5Aliases.has(u.alias.toUpperCase())) return;

        // 1. Space in aliid (raw alias)
        if (u.rawAlias && u.rawAlias.includes(' ')) return;

        // 2. Dummy / Invalid Alias ID
        const cleanAlias = (u.alias || '').trim().toUpperCase();
        const invalidAliases = new Set(['-', 'NONE', 'NO', 'NA', 'N/A', 'NIL', 'NULL', 'UNDEFINED']);
        if (!cleanAlias || invalidAliases.has(cleanAlias) || cleanAlias.length < 3) return;

        // 3. Double Address (Duplicate Contact Number or Duplicate Alias Submission)
        const contact = (u.contact || '').trim();
        if (contact && contactCounts[contact] > 1) return;
        if (cleanAlias && aliasCounts[cleanAlias] > 1) return;

        // 4. Aliid / AWS name mismatch
        if (u.nameOnAws) {
          const isMatched = nameMatches(u.name, u.nameOnAws);
          if (!isMatched) return;
        }

        // 5. Dummy / Invalid registered Name
        const cleanName = (u.name || '').trim().toLowerCase();
        if (cleanName.length < 3 || cleanName.includes('test') || cleanName.includes('admin') || cleanName.includes('anonymous')) return;

        // 6. Dummy / Invalid registered Contact
        if (contact && ['1234567890', '0000000000', '123456789', '9876543210'].includes(contact)) return;

        // Passes all verification! Add to authentic candidate pool
        authenticPool.push({
          id: authenticPool.length + 1,
          name: u.name || 'Anonymous Builder',
          alias: u.alias
        });
      });

      return authenticPool;
    };

    // Initially evaluate with the first 300 entries
    let authenticPool = getShortlist(300);

    // If authentic pool drops below 250, dynamically expand evaluation slice to 350
    if (authenticPool.length < 250) {
      authenticPool = getShortlist(350);
    }

    setStudents(authenticPool);

    // Check if there are saved winners in localStorage
    const savedWinners = localStorage.getItem('giveaway_winners');
    if (savedWinners) {
      try {
        const parsed = JSON.parse(savedWinners);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((w: any, idx: number) => {
            let r = w.round !== undefined ? Number(w.round) : undefined;
            if (r === undefined || isNaN(r)) {
              r = Math.floor(idx / 50) + 1;
            }
            return {
              id: w.id || 0,
              name: w.name || 'Anonymous',
              alias: w.alias || w.roll?.replace(/^@/, '') || 'unknown',
              round: r
            };
          });
          setWinners(normalized);
          const roundCount = Math.floor(normalized.length / 50) + 1;
          setCurrentRound(Math.min(roundCount, 4));
        }
      } catch (e) {
        console.error("Failed to parse saved winners", e);
      }
    }



    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, [allUsers, leaderboard, dataLoading]);

  const triggerConfetti = (isFull: boolean = false) => {
    // Left side burst
    confetti({
      particleCount: 150,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.8 }
    });
    // Right side burst
    confetti({
      particleCount: 150,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.8 }
    });
    // Center big burst
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 }
    });

    if (isFull) {
      const end = Date.now() + 4000;
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({
          particleCount: 80,
          startVelocity: 30,
          spread: 360,
          origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
      }, 200);
    }
  };

  const startRoundDraw = () => {
    if (isDrawing || currentRound > 3 || students.length === 0) return;

    setIsDrawing(true);
    
    // Get the remaining students pool (excluding already selected winners)
    const winnerAliases = new Set(winners.map(w => (w.alias || '').toUpperCase()));
    const remainingPool = students.filter(s => !winnerAliases.has((s.alias || '').toUpperCase()));

    if (remainingPool.length < 50) {
      alert(`Not enough students in the pool! Remaining: ${remainingPool.length}`);
      setIsDrawing(false);
      return;
    }

    // Randomly pick 50 unique students from the remaining pool
    const selectedRoundWinners: Student[] = [];
    const poolCopy = [...remainingPool];
    for (let i = 0; i < 50; i++) {
      const randomIndex = Math.floor(Math.random() * poolCopy.length);
      const chosen = poolCopy.splice(randomIndex, 1)[0];
      chosen.round = currentRound;
      selectedRoundWinners.push(chosen);
    }

    // Live Slot Machine Rolling Name Animation
    let speed = 40;
    let duration = 0;
    const maxDuration = 4000; // 4 seconds total
    let soundTicker = 0;

    const rollNames = () => {
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      setScrollingName(randomStudent.name);
      setScrollingAlias(`@${randomStudent.alias}`);

      soundTicker++;
      if (soundTicker % 3 === 0) {
        playSound('tick');
      }

      duration += speed;

      if (duration > maxDuration * 0.7) {
        speed = Math.min(speed + 35, 300);
      }

      if (duration < maxDuration) {
        animationTimerRef.current = setTimeout(rollNames, speed);
      } else {
        // Animation finished! Add all winners of this round
        const newWinners = [...winners, ...selectedRoundWinners];
        setWinners(newWinners);
        localStorage.setItem('giveaway_winners', JSON.stringify(newWinners));
        
        // Final display winner
        const lastWinner = selectedRoundWinners[49];
        setScrollingName(`🎉 ${lastWinner.name}`);
        setScrollingAlias(`@${lastWinner.alias}`);
        
        setIsDrawing(false);
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);

        playSound('blaster');
        setTimeout(() => {
          playSound('fanfare');
          triggerConfetti(nextRound > 3);
          
          setModalRound(currentRound);
          setShowCompleteModal(true);
        }, 300);
      }
    };

    rollNames();
  };

  const handleReset = () => {
    if (window.confirm("This will clear all winners. Are you sure?")) {
      setWinners([]);
      setCurrentRound(1);
      setScrollingName('Ready to Roll?');
      setScrollingAlias('@alias');
      localStorage.removeItem('giveaway_winners');
    }
  };

  if (dataLoading && students.length === 0) {
    return (
      <div className="min-h-screen bg-[#060913] text-white flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin text-[#7C3AED] mb-4" size={48} />
        <p className="text-white/60 tracking-wider text-sm">Loading participants data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-white pt-24 pb-16 px-4 md:px-8 font-sans overflow-x-hidden relative flex flex-col items-center">
      {/* Background Neon Orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#7C3AED]/15 rounded-full filter blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full filter blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-5xl flex flex-col gap-8 relative z-10">
        
        {/* 1. Header / Hero Banner */}
        <header className="relative w-full rounded-3xl p-6 sm:p-8 md:p-12 overflow-hidden text-center flex flex-col items-center gap-4 border border-white/10 shadow-[0_0_50px_rgba(124,58,237,0.15)] backdrop-blur-md bg-white/[0.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-orange-600/5 -z-10" />
          
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-orange-500 to-[#7C3AED] opacity-75 blur-md group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0F1426] border border-white/20 text-orange-500">
              <Gift className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-orange-400 via-white to-purple-400 bg-clip-text text-transparent drop-shadow">
            🎉 Student Giveaway Draw
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-white/70 max-w-2xl font-light">
            <span className="font-bold text-orange-400 glow-text">{allUsers.length.toLocaleString()}</span> participants · <span className="font-semibold text-white">150</span> winners · <span className="font-semibold text-white">3</span> rounds
          </p>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs text-white/50 tracking-wider">
            Campaign pool: registered AWS Builder ID entries
          </div>

          {/* Progress Bar Container */}
          <div className="w-full max-w-md mt-4 flex flex-col gap-2">
            <div className="flex justify-between text-[10px] sm:text-xs font-semibold text-white/50 px-1">
              <span>PROGRESS</span>
              <span>Round {Math.min(currentRound, 3)} of 3</span>
            </div>
            <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                style={{ width: `${((currentRound - 1) / 3) * 100}%` }}
              />
            </div>
          </div>
        </header>


        {/* ── GOODIES CLAIM NOTICE (Responsive & Mobile Optimized) ── */}
        <section className="hidden md:flex w-full rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-orange-500/10 via-purple-600/10 to-transparent border border-white/10 shadow-xl flex-col md:flex-row items-stretch md:items-center justify-between gap-6 backdrop-blur-md">
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

        {/* 2. Giant Live Selector Console */}
        <section className="w-full flex flex-col gap-6">
          <div className="w-full rounded-3xl p-6 sm:p-10 md:p-14 bg-[#0F1426]/75 border border-white/10 backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-center text-center h-[300px] sm:h-[360px] shadow-[0_15px_40px_rgba(124,58,237,0.15)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-[#7C3AED] to-cyan-500" />
            
            <div className="flex flex-col gap-1.5 z-10 w-full px-2">
              <span className="text-xs sm:text-sm uppercase tracking-widest text-[#7C3AED] font-black glow-text animate-pulse">LIVE SELECTOR</span>
              <div className={`text-3xl sm:text-4xl md:text-6xl font-black my-4 sm:my-6 transition-all duration-100 ${isDrawing ? 'scale-105 opacity-95 text-orange-400' : 'scale-100 text-white'} truncate max-w-full`}>
                {scrollingName}
              </div>
              <div className="text-lg sm:text-xl md:text-2xl text-[#00CFFF] font-mono font-bold tracking-wider truncate max-w-full">
                {scrollingAlias}
              </div>
            </div>

            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1426] via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Controls Panel */}
          <div className="w-full rounded-3xl p-5 sm:p-6 bg-white/[0.02] border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
            <div className="flex flex-col gap-1 text-center md:text-left">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <Award size={18} className="text-orange-400" /> Control Hub
              </h3>
              <p className="text-[11px] sm:text-xs text-white/40">
                {currentRound <= 3 ? `Draw 50 lucky winners for Round ${currentRound}.` : 'All draws finished! 🎉'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto">
              <button
                onClick={startRoundDraw}
                disabled={isDrawing || currentRound > 3}
                className={`w-full sm:w-auto relative group overflow-hidden px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all shadow-lg active:scale-95 flex items-center justify-center ${
                  isDrawing || currentRound > 3 
                    ? 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-orange-500 to-[#7C3AED] text-white hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] border border-orange-400/20'
                }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isDrawing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      DRAWING NAMES...
                    </>
                  ) : currentRound <= 3 ? (
                    `START ROUND ${currentRound}`
                  ) : (
                    'DRAW COMPLETED'
                  )}
                </span>
                {!(isDrawing || currentRound > 3) && (
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={isDrawing}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-all text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Reset entire draw"
              >
                <RotateCcw size={16} /> Reset
              </button>
            </div>
          </div>
        </section>

        {/* 3. Widescreen 3-Column Winners Lists (Rounds 1, 2, 3) */}
        <section className="w-full flex flex-col gap-6 bg-white/[0.01] border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-md">
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Gift size={20} className="text-[#7C3AED]" /> Live Winners Board ({winners.length} / 150)
            </h2>
            <p className="text-[11px] sm:text-xs text-white/40 mt-1">Winners listed vertically by round. Scroll down each round column to view more.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(roundNum => {
              const roundWinners = winners.filter(w => w.round === roundNum);
              const hasData = roundWinners.length > 0;
              
              return (
                <div key={roundNum} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold tracking-wider uppercase text-white/50">Round {roundNum}</span>
                    <span className="text-[10px] text-white/30">{roundWinners.length} of 50 Drawn</span>
                  </div>
                  
                  <div 
                    className={`flex flex-col gap-2 p-3 rounded-2xl border scroll-smooth custom-scrollbar max-h-[380px] overflow-y-auto min-h-[120px] ${
                      roundNum === 1 ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400' :
                      roundNum === 2 ? 'border-orange-500/20 bg-orange-500/5 text-orange-400' :
                      'border-purple-500/20 bg-purple-500/5 text-purple-400'
                    }`}
                  >
                    {!hasData ? (
                      <span className="text-xs text-white/30 italic py-6 text-center">Round {roundNum} winners will appear here once drawn...</span>
                    ) : (
                      roundWinners.map((winner, idx) => (
                        <div 
                          key={winner.alias} 
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-all text-xs font-semibold text-white group"
                          style={{
                            animation: `fadeInScale 0.3s ease forwards ${idx * 0.01}s`,
                            opacity: 0,
                            transform: 'scale(0.95)'
                          }}
                        >
                          <span className="text-[#7C3AED] font-bold">{(roundNum - 1) * 50 + idx + 1}.</span>
                          <span className="truncate">{winner.name}</span>
                          <span className="text-[#00CFFF] font-mono text-[10px] ml-auto shrink-0">@{winner.alias}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>


        {/* 4. Footer */}
        <footer className="w-full rounded-3xl p-5 sm:p-6 bg-white/[0.01] border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <span className="text-xs text-white/40 font-semibold tracking-wider">STATS SUMMARY</span>
            <div className="text-sm font-medium text-white/70">
              Total Winners: <span className="text-white font-bold">{winners.length}</span> / 150 · Rounds Complete: <span className="text-white font-bold">{Math.max(0, currentRound - 1)}</span> / 3
            </div>
          </div>

          {currentRound > 3 ? (
            <button
              onClick={() => navigate('/winners')}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white font-black tracking-wide shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer"
            >
              🏆 Winners Hall <ArrowRight size={15} />
            </button>
          ) : (
            <div className="text-xs text-white/40 font-medium flex items-center justify-center gap-1.5">
              <AlertTriangle size={14} className="text-orange-400" />
              Draws are computed on-the-fly and recorded safely.
            </div>
          )}
        </footer>

      </div>

      {/* Redirect Popup Modal overlay */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm sm:max-w-md liquid-glass border border-white/10 rounded-3xl p-6 sm:p-8 text-center overflow-hidden shadow-[0_20px_60px_rgba(124,58,237,0.3)] flex flex-col items-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#7C3AED]/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#7C3AED] mb-4">
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              Round {modalRound} Complete!
            </h2>
            <p className="text-white/60 text-xs sm:text-sm mt-3 leading-relaxed">
              Successfully drew 50 lucky builders from the participant pool. Let's head over to the Winners Hall to see the full list of achievements and claiming details!
            </p>

            <div className="flex flex-col gap-3 w-full mt-6">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  navigate('/winners');
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.4)] cursor-pointer"
              >
                Go to Winners Hall <ArrowUpRight size={16} />
              </button>
              
              {modalRound < 3 && (
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="w-full py-3 rounded-xl border border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all text-xs font-semibold cursor-pointer"
                >
                  Continue drawing next round
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .bg-grid-pattern {
          background-size: 24px 24px;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
        }
        .glow-text {
          text-shadow: 0 0 12px rgba(249,115,22,0.4);
        }
        @keyframes fadeInScale {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.01);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}
