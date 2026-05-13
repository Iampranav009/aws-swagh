import { useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/awsstudentbuildergroup_jdiet?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
      </svg>
    ),
    hoverColor: 'hover:text-[#E1306C] hover:shadow-[0_5px_20px_rgba(225,48,108,0.35)]',
  },
  {
    label: 'WhatsApp',
    href: 'https://chat.whatsapp.com/DEw9MvyogHH8OXj8Qce8d7',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ),
    hoverColor: 'hover:text-[#25D366] hover:shadow-[0_5px_20px_rgba(37,211,102,0.35)]',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/aws-student-builder-group-jdiet/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    hoverColor: 'hover:text-[#0A66C2] hover:shadow-[0_5px_20px_rgba(10,102,194,0.35)]',
  },
  {
    label: 'Meetup',
    href: 'https://www.meetup.com/aws-sbg-at-jawaharlal-darda-institute-of-eng-and-tech/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.24 12.94a5.68 5.68 0 01-1.49 3.9 5.5 5.5 0 01-3.64 1.74 5.45 5.45 0 01-2.06-.3 4.85 4.85 0 01-2.84 1.05 5.11 5.11 0 01-3.44-1.28 4.83 4.83 0 01-1.65-3.17 4.78 4.78 0 01.73-3.07 5.06 5.06 0 01-.54-4.14 5.27 5.27 0 013.26-3.34 5.42 5.42 0 014.83.7A5.35 5.35 0 0114.7 4.5a5.49 5.49 0 014.03 2.25 5.37 5.37 0 01.51 6.19zM11.2 20.85a3.88 3.88 0 002.27-.83 5.45 5.45 0 01-1.41-.59 5.51 5.51 0 01-2-2.34 4.38 4.38 0 01-.41 1.33 3.83 3.83 0 001.55 2.43zm5.1-2.35a4.42 4.42 0 001.2-3.06 4.46 4.46 0 00-1.07-2.91 4.35 4.35 0 00-2.65-1.48 4.49 4.49 0 00-3.14.65 4.42 4.42 0 00-1.8 2.44 4.3 4.3 0 00.36 3.15 4.43 4.43 0 002.41 2.1 4.38 4.38 0 004.69-.89z"/>
      </svg>
    ),
    hoverColor: 'hover:text-[#ED1C40] hover:shadow-[0_5px_20px_rgba(237,28,64,0.35)]',
  },
];

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
    <section className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4"
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover translate-y-[17%]"
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[20%]">
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
          <div className="pt-4">
            <button className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors">
              Manifesto
            </button>
          </div>
        </div>
      </div>

      {/* Social media icons — transparent glass style */}
      <div className="relative z-10 flex justify-center gap-4 pb-12">
        {SOCIAL_LINKS.map(({ label, href, icon, hoverColor }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={`liquid-glass rounded-full p-4 text-white/80 hover:text-white ${hoverColor} transition-all duration-300 hover:-translate-y-1 hover:scale-110`}
          >
            {icon}
          </a>
        ))}
      </div>
    </section>
  );
}
