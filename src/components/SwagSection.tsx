import { motion } from 'framer-motion';
import SwagWinnersSection from './SwagWinnersSection';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function SwagSection() {
  return (
    <section className="relative pt-24 pb-20 px-6 bg-[#0B0F1A] overflow-hidden" id="swag">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#7C3AED]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#00CFFF]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16">
        {/* Banner Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl bg-[#0B0F1A]/50 backdrop-blur-sm flex flex-col lg:flex-row items-center lg:items-stretch lg:min-h-[500px]"
        >
          {/* Desktop Gradient Overlay */}
          <div className="absolute inset-y-0 left-0 w-full lg:w-[65%] bg-gradient-to-r from-[#0B0F1A] via-[#0B0F1A]/95 to-transparent z-10 pointer-events-none hidden lg:block"></div>

          {/* Text Content */}
          <div className="relative z-20 w-full lg:w-3/5 flex flex-col items-center text-center justify-center p-8 sm:p-10 lg:p-16 space-y-8 order-1">
            <div className="flex flex-col items-center w-full">
              <div className="relative inline-flex flex-col mb-4">
                <img 
                  src="/aws-logo.png" 
                  alt="AWS Logo" 
                  className="h-12 md:h-16 w-auto object-contain brightness-125"
                />
              </div>

              <h2 className="text-white text-4xl sm:text-6xl lg:text-7xl font-sans font-extrabold uppercase tracking-tighter leading-none drop-shadow-lg mb-6 mt-2">
                AWS SWAG PACK
              </h2>

              <div className="flex flex-col items-center w-full mt-1">
                <div className="flex items-center justify-center gap-4 w-full mb-2">
                  <div className="h-[1px] w-12 sm:w-20 bg-white/40"></div>
                  <h3 className="text-[#00CFFF] font-black tracking-widest text-base sm:text-lg uppercase drop-shadow-md">
                    LAST DATE
                  </h3>
                  <div className="h-[1px] w-12 sm:w-20 bg-white/40"></div>
                </div>
                <h3 className="text-white text-2xl sm:text-3xl lg:text-5xl font-bold tracking-wider uppercase drop-shadow mt-1">
                  23<sup className="text-xl sm:text-2xl font-bold">RD</sup> MAY, 2026
                </h3>
              </div>

              <Link
                to="/auth?signup=true"
                className="liquid-glass group relative flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white text-sm sm:text-base font-semibold px-8 py-3 rounded-full hover:bg-white/10 hover:border-[#00CFFF]/50 transition-all overflow-hidden"
              >
                <Zap size={16} className="text-[#00CFFF]" />
                <span className="tracking-tight uppercase">Claim Your Swag</span>
              </Link>
            </div>
          </div>

          {/* Image Layer */}
          <div className="relative lg:absolute lg:inset-y-0 lg:right-0 w-full lg:w-[60%] z-10 flex items-center justify-center lg:justify-end pb-12 lg:pb-0 px-6 lg:px-0 order-2">
            <img 
              src="/swag/banner-img.png" 
              alt="AWS Swag" 
              className="w-full max-w-2xl lg:max-w-none h-auto lg:h-full object-contain object-center lg:object-right lg:pr-8 drop-shadow-2xl"
            />
          </div>
        </motion.div>

        {/* Reusable Winners & Goodies Section */}
        <SwagWinnersSection />
      </div>
    </section>
  );
}
