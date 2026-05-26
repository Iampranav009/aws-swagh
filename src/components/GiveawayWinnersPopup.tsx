import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Sparkles, Trophy, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function GiveawayWinnersPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Show the popup on every full page load.
    // Only skip if the user is already on the winners page or auth page.
    const isExcludedPage = location.pathname === '/winners' || location.pathname === '/auth';

    if (!isExcludedPage) {
      // Small delay to let the page load smoothly
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const triggerSparkles = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 40 * (timeLeft / duration);

      // Sparkles raining down from top corners
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#7C3AED', '#00CFFF', '#FF9900', '#FFFFFF']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#7C3AED', '#00CFFF', '#FF9900', '#FFFFFF']
      });
    }, 250);

    // Initial big side bursts
    confetti({
      particleCount: 100,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors: ['#7C3AED', '#00CFFF', '#FF9900']
    });
    confetti({
      particleCount: 100,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors: ['#7C3AED', '#00CFFF', '#FF9900']
    });
  };

  useEffect(() => {
    if (isOpen) {
      triggerSparkles();
    }
  }, [isOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
  };

  const handleViewWinners = () => {
    setIsOpen(false);
    navigate('/winners');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          {/* Animated Background Sparks Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-10 left-10 w-72 h-72 bg-[#7C3AED]/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#00CFFF]/10 rounded-full blur-[120px] animate-pulse" />
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
            className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0F1426]/90 border border-white/10 shadow-[0_20px_50px_rgba(124,58,237,0.3)] text-center flex flex-col items-center gap-5 overflow-hidden liquid-glass"
          >
            {/* Top ambient color bar */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-orange-500 via-[#7C3AED] to-cyan-500" />

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white transition-all"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>

            {/* Banner Image */}
            <div className="w-full mt-6">
              <img 
                src="/swag/result-are-live.png.png" 
                alt="Results are Live" 
                className="w-full h-auto rounded-[1.25rem] shadow-[0_10px_30px_rgba(124,58,237,0.3)] border border-white/10 object-cover"
              />
            </div>

            {/* Text Information */}
            <div className="space-y-2 mt-1">
              <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                Results Are In! 🎉
              </h2>
              <p className="text-white/70 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
                Explore our leaderboard champions and see if you are one of the 150 lucky giveaway winners.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3.5 w-full mt-2">
              <button
                onClick={handleViewWinners}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:opacity-95 text-white font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center justify-center gap-2 group cursor-pointer"
              >
                View Winners List <Award size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
