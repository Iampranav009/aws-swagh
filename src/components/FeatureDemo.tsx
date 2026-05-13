import { AnimatedFeatureCard } from "@/components/ui/feature-card-1";

// Data for the feature cards
const features = [
  {
    index: "001",
    tag: "Healthy eating and gut health visualization",
    title: "Eat better to boost your gut health by 30s.",
    imageSrc: "https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-79XLKwCuOZGHdVcOlEApISx6x2nVd2.png&w=1000&q=75",
    color: "orange" as const,
  },
  {
    index: "002",
    tag: "Chemical-free lifestyle and longevity illustration",
    title: "Avoid Chemicals to have a longer lifespan.",
    imageSrc: "https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-DtOMYxIaV2eptIhXTkorEzdNzhlgXK.png&w=1000&q=75",
    color: "purple" as const,
  },
  {
    index: "003",
    tag: "Meditation and potential unlocking visualization",
    title: "Quick Calm Sessions that unlock your potential.",
    imageSrc: "https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-eDCSln4vQRsBBiP3mWirJOXYDyFO6q.png&w=1000&q=75",
    color: "blue" as const,
  },
];

export default function FeatureCardDemo() {
  return (
    <section className="flex w-full items-center justify-center bg-[#0B0F1A] py-24 px-4 relative z-10">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Features For Builders</h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">Discover how our tools and practices empower you to build better.</p>
        </div>
        <div className="grid max-w-5xl mx-auto grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <AnimatedFeatureCard
              key={feature.index}
              index={feature.index}
              tag={feature.tag}
              title={feature.title}
              imageSrc={feature.imageSrc}
              color={feature.color}
              className="mx-auto border-white/5 bg-white/5 backdrop-blur-sm"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
