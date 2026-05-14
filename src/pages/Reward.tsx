import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import SwagSection from '../components/SwagSection';
import BadgesSection from '../components/BadgesSection';

export default function Reward() {
  return (
    <div className="bg-[#0B0F1A] min-h-screen pt-[100px] flex flex-col relative w-full overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#7C3AED]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] bg-[#00CFFF]/10 rounded-full blur-[150px] pointer-events-none" />

      <main className="flex-1 w-full relative z-10">
        {/* Swag Pack Section at the top */}
        <SwagSection />

        {/* Badges System Section */}
        <BadgesSection />

        {/* Major CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 text-center border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#00CFFF]/10" />
              <div className="absolute inset-0 backdrop-blur-3xl bg-[#0B0F1A]/40" />
              
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">
                  Ready to win some <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]">AWS Swag</span>?
                </h2>
                <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto">
                  Don't wait! Join hundreds of students already building and earning exclusive rewards. 
                  Every referral counts towards your next big win.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/auth?signup=true"
                    className="liquid-glass w-full sm:w-auto bg-white/5 border border-white/10 text-white text-sm sm:text-base font-semibold px-8 py-3.5 rounded-full hover:bg-white/10 hover:border-[#7C3AED]/50 transition-all"
                  >
                    Start Your Journey
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="liquid-glass w-full sm:w-auto text-white text-sm sm:text-base font-semibold px-8 py-3.5 rounded-full border border-white/10 hover:bg-white/10 hover:border-[#00CFFF]/50 transition-all"
                  >
                    View Leaderboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
