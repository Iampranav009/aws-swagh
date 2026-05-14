import { Gift, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const RANK_DATA = [
  {
    rank: '1st Rank',
    image: '/swag/img-1.png',
    color: 'from-yellow-400 to-yellow-600',
    shadow: 'shadow-yellow-500/20',
    delay: 0.1
  },
  {
    rank: '2nd Rank',
    image: '/swag/img-2.png',
    color: 'from-slate-300 to-slate-500',
    shadow: 'shadow-slate-400/20',
    delay: 0.2
  },
  {
    rank: '3rd Rank',
    image: '/swag/img-3.png',
    color: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/20',
    delay: 0.3
  }
];

const GOODIES_LIST = [
  'AWS T-Shirt (3)',
  'AWS Bag (1)',
  'AWS Builder Card (150)',
  'AWS Pen (150)',
  'Keyboard (2)',
  'Mouse (2)',
  'AWS Pouch (1)',
  'AWS Coffee Mug (6)'
];

export default function SwagWinnersSection() {
  return (
    <div className="w-full space-y-16 py-8">
      {/* Rank Based Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {RANK_DATA.map((item) => (
          <motion.div
            key={item.rank}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: item.delay }}
            className="group relative"
          >
            <div className="relative rounded-2xl p-0 border border-white/10 flex flex-col items-center justify-center transition-all duration-500 hover:border-[#FF9900]/40 bg-[#0B0F1A]/50 overflow-hidden">
              <div className="relative w-full aspect-[3/4] overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.rank} 
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 z-20"
                />
                <div className={`absolute inset-0 bg-gradient-to-tr ${item.color} opacity-0 group-hover:opacity-20 blur-[30px] transition-opacity duration-700 z-10`}></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Goodies Distribution Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto"
      >
        <div className="liquid-glass rounded-3xl p-8 sm:p-10 border border-white/10 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FF9900]/10 rounded-full blur-[80px] group-hover:bg-[#FF9900]/20 transition-all duration-700"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-5 p-3 rounded-2xl bg-[#FF9900]/10 border border-[#FF9900]/20">
              <Gift className="text-[#FF9900] w-6 h-6" />
            </div>
            
            <h3 className="text-white text-2xl sm:text-3xl mb-2">
              Total Goodies Distribution
            </h3>
            <p className="text-white/60 mb-8 max-w-lg text-sm sm:text-base leading-relaxed">
              We are distributing a massive collection of AWS goodies among our community members. Here's exactly what's up for grabs!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 w-full text-left max-w-lg mx-auto">
              {GOODIES_LIST.map((goodie, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className="flex items-center space-x-3 group/item"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover/item:border-[#FF9900]/50 group-hover/item:bg-[#FF9900]/5 transition-all">
                    <CheckCircle2 className="text-[#FF9900] w-4 h-4 opacity-40 group-hover/item:opacity-100" />
                  </div>
                  <span className="text-white/80 text-sm sm:text-base font-medium group-hover/item:text-white transition-colors">
                    {goodie}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
