import { useRef } from 'react';
import { AnimatedFeatureCard } from '@/components/ui/feature-card-1';

const features = [
  {
    index: '001',
    tag: 'Learn Real AWS Skills',
    title: 'Master cloud technologies used in real-world applications.',
    imageSrc: '/features/img-1.png',
    color: 'blue' as const,
  },
  {
    index: '002',
    tag: 'Build Real-World Projects',
    title: 'Turn your knowledge into real, deployable cloud projects.',
    imageSrc: '/features/img-2.png',
    color: 'purple' as const,
  },
  {
    index: '003',
    tag: 'Join a Strong Tech Community',
    title: 'Connect, collaborate, and grow with like-minded builders.',
    imageSrc: '/features/img-3.png',
    color: 'orange' as const,
  },
  {
    index: '004',
    tag: 'Compete & Earn Rewards',
    title: 'Climb the leaderboard, earn points, and win exclusive goodies.',
    imageSrc: '/features/img-4.png',
    color: 'blue' as const,
  },
];

export default function FeaturesSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="w-full bg-[#0B0F1A] py-24 px-4 relative z-10">
      <div className="max-w-6xl mx-auto">

        {/* Section Heading */}
        <div className="text-center mb-16">
          <p className="text-[#00CFFF] text-sm font-semibold uppercase tracking-widest mb-3">
            Why Join AWS Builder Program?
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Build. Compete. Grow.
          </h2>
          <p className="text-white/50 mt-4 text-base max-w-xl mx-auto">
            Discover how our tools and practices empower you to build better.
          </p>
        </div>

        {/* Desktop grid / Mobile horizontal scroll */}
        <div
          ref={scrollRef}
          className="features-scroll-row"
        >
          {features.map((f) => (
            <div key={f.index} className="features-card-wrapper">
              <AnimatedFeatureCard
                index={f.index}
                tag={f.tag}
                title={f.title}
                imageSrc={f.imageSrc}
                color={f.color}
                className="border-white/5 bg-white/5 backdrop-blur-sm w-full h-[380px]"
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .features-scroll-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        .features-card-wrapper {
          display: flex;
          justify-content: center;
        }
        .features-card-wrapper > * {
          max-width: 100% !important;
          width: 100% !important;
        }

        /* Mobile: horizontal snap scroll */
        @media (max-width: 768px) {
          .features-scroll-row {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            gap: 16px;
            padding-bottom: 12px;
            scrollbar-width: none;
          }
          .features-scroll-row::-webkit-scrollbar {
            display: none;
          }
          .features-card-wrapper {
            flex: 0 0 80vw;
            scroll-snap-align: start;
          }
        }
      `}</style>
    </section>
  );
}
