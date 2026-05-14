import Hero from '../components/Hero';
import SignupProcess from '../components/SignupProcess';
import FeaturesSection from '../components/FeaturesSection';
import ConnectSection from '../components/ConnectSection';
import ArtSection from '../components/ArtSection';
import BadgesSection from '../components/BadgesSection';
import Footer from '../components/Footer';
import SwagSection from '../components/SwagSection';

export default function Home() {
  return (
    // pb-28 ensures content isn't hidden behind mobile bottom nav
    <div className="bg-[#0B0F1A] min-h-screen pb-28 md:pb-0">
      <Hero />
      <SwagSection />
      <SignupProcess />
      <BadgesSection />

      <FeaturesSection />
      <ArtSection />
      <ConnectSection />
      <Footer />
    </div>
  );
}

