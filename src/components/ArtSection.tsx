import { useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

export default function ArtSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadingOutRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const fade = (targetOpacity: number, duration: number, callback?: () => void) => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      const startOpacity = parseFloat(video.style.opacity) || 0;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        video.style.opacity = (startOpacity + (targetOpacity - startOpacity) * progress).toString();

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = null;
          if (callback) callback();
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Initial fade in
    video.style.opacity = '0';
    fade(1, 500);

    const handleTimeUpdate = () => {
      if (video.duration - video.currentTime <= 0.55 && !fadingOutRef.current) {
        fadingOutRef.current = true;
        fade(0, 500);
      }
    };

    const handleEnded = () => {
      video.style.opacity = '0';
      setTimeout(() => {
        video.currentTime = 0;
        video.play().then(() => {
          fadingOutRef.current = false;
          fade(1, 500);
        }).catch(() => {
          // Ignore autoplay errors
        });
      }, 100);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <section className="relative min-h-[115vh] bg-black overflow-hidden flex flex-col pb-20">
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4"
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover translate-y-[17%]"
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[25%]">
        <h2 
          className="text-5xl md:text-6xl lg:text-7xl text-white mb-8 tracking-tight whitespace-nowrap"
        >
          Built for the curious
        </h2>
        
        <div className="max-w-xl w-full space-y-4">
          <div className="liquid-glass rounded-full pl-6 pr-2 py-2 flex items-center gap-3">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="text-white placeholder:text-white/40 text-base flex-1 bg-transparent border-none outline-none"
            />
            <button className="bg-white rounded-full p-3 text-black hover:bg-gray-200 transition-colors">
              <ArrowRight size={20} />
            </button>
          </div>
          <p className="text-white text-sm leading-relaxed px-4">
            Stay updated with the latest news and insights. Subscribe to our newsletter today and never miss out on exciting updates.
          </p>

        </div>
      </div>


    </section>
  );
}
