import { useRef } from 'react';
import { AnimatedFeatureCard } from '@/components/ui/feature-card-1';

const benefits = [
  {
    index: '001',
    tag: 'Boost Your Career',
    title: 'Stand out with real cloud experience and gain an edge in placements.',
    imageSrc: '/benifits/img-1.png',
    color: 'purple' as const,
  },
  {
    index: '002',
    tag: 'Gain Practical Knowledge',
    title: 'Learn beyond textbooks with real-world, industry-ready thinking.',
    imageSrc: '/benifits/img-2.png',
    color: 'orange' as const,
  },
  {
    index: '003',
    tag: 'Expand Your Network',
    title: 'Meet developers, mentors, and collaborators through meaningful connections.',
    imageSrc: '/benifits/img-3.png',
    color: 'blue' as const,
  },
  {
    index: '004',
    tag: 'Earn Recognition',
    title: 'Get noticed through rankings, rewards, and community visibility.',
    imageSrc: '/benifits/imag-4.png',
    color: 'purple' as const,
  },
];

export default function BenefitsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="w-full bg-[#0B0F1A] py-24 px-4 relative z-10">
      <div className="max-w-6xl mx-auto">

        {/* Section Heading */}
        <div className="text-center mb-16">
          <p className="text-[#7C3AED] text-sm font-semibold uppercase tracking-widest mb-3">
            Benefits of Builders ID Build
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            What You Gain
          </h2>
          <p className="text-white/50 mt-4 text-base max-w-xl mx-auto">
            Everything you need to level up your skills, career, and connections.
          </p>
        </div>

        {/* Desktop grid / Mobile horizontal scroll */}
        <div
          ref={scrollRef}
          className="benefits-scroll-row"
        >
          {benefits.map((b) => (
            <div key={b.index} className="benefits-card-wrapper">
              <AnimatedFeatureCard
                index={b.index}
                tag={b.tag}
                title={b.title}
                imageSrc={b.imageSrc}
                color={b.color}
                className="border-white/5 bg-white/5 backdrop-blur-sm w-full h-[380px]"
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .benefits-scroll-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        .benefits-card-wrapper {
          display: flex;
          justify-content: center;
        }
        .benefits-card-wrapper > * {
          max-width: 100% !important;
          width: 100% !important;
        }

        /* Mobile: horizontal snap scroll */
        @media (max-width: 768px) {
          .benefits-scroll-row {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            gap: 16px;
            padding-bottom: 12px;
            scrollbar-width: none;
          }
          .benefits-scroll-row::-webkit-scrollbar {
            display: none;
          }
          .benefits-card-wrapper {
            flex: 0 0 80vw;
            scroll-snap-align: start;
          }
        }
      `}</style>
    </section>
  );
}
