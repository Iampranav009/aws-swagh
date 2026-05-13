import Hero from '../components/Hero';
import SignupProcess from '../components/SignupProcess';
import Benefits from '../components/Benefits';
import FeatureDemo from '../components/FeatureDemo';
import ConnectSection from '../components/ConnectSection';
import ArtSection from '../components/ArtSection';
import GoodiesSection from '../components/GoodiesSection';
import Footer from '../components/Footer';

export default function Home() {
  return (
    // pb-28 ensures content isn't hidden behind mobile bottom nav
    <div className="bg-[#0B0F1A] min-h-screen pb-28 md:pb-0">
      <Hero />
      <SignupProcess />
      <Benefits />
      <FeatureDemo />
      <ConnectSection />
      <ArtSection />
      <GoodiesSection />
      <Footer />
    </div>
  );
}
