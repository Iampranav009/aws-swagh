import { Phone, MapPin, Globe, User } from 'lucide-react';

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    handle: '@awsstudentbuildergroup_jdiet',
    href: 'https://www.instagram.com/awsstudentbuildergroup_jdiet?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    handle: 'Join our group',
    href: 'https://chat.whatsapp.com/DEw9MvyogHH8OXj8Qce8d7',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    handle: 'AWS SBG JDIET',
    href: 'https://www.linkedin.com/company/aws-student-builder-group-jdiet/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    label: 'Meetup',
    handle: 'Join our events',
    href: 'https://www.meetup.com/aws-sbg-at-jawaharlal-darda-institute-of-eng-and-tech/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.24 12.94a5.68 5.68 0 01-1.49 3.9 5.5 5.5 0 01-3.64 1.74 5.45 5.45 0 01-2.06-.3 4.85 4.85 0 01-2.84 1.05 5.11 5.11 0 01-3.44-1.28 4.83 4.83 0 01-1.65-3.17 4.78 4.78 0 01.73-3.07 5.06 5.06 0 01-.54-4.14 5.27 5.27 0 013.26-3.34 5.42 5.42 0 014.83.7A5.35 5.35 0 0114.7 4.5a5.49 5.49 0 014.03 2.25 5.37 5.37 0 01.51 6.19zM11.2 20.85a3.88 3.88 0 002.27-.83 5.45 5.45 0 01-1.41-.59 5.51 5.51 0 01-2-2.34 4.38 4.38 0 01-.41 1.33 3.83 3.83 0 001.55 2.43zm5.1-2.35a4.42 4.42 0 001.2-3.06 4.46 4.46 0 00-1.07-2.91 4.35 4.35 0 00-2.65-1.48 4.49 4.49 0 00-3.14.65 4.42 4.42 0 00-1.8 2.44 4.3 4.3 0 00.36 3.15 4.43 4.43 0 002.41 2.1 4.38 4.38 0 004.69-.89z"/>
      </svg>
    ),
  },
];

export default function ConnectSection() {
  return (
    <section className="relative py-24 px-6 bg-[#0B0F1A] overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7C3AED] blur-[140px] rounded-full opacity-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00CFFF] blur-[140px] rounded-full opacity-8" />
      </div>

      {/* Top divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Section label + title */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold tracking-[0.25em] text-[#00CFFF] uppercase mb-4 px-4 py-1.5 rounded-full border border-[#00CFFF]/20 bg-[#00CFFF]/5">
            Connect With Us
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl text-white mb-5 leading-tight">
            Always Open.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#00CFFF]">
              For Anyone Who Wants to Build.
            </span>
          </h2>
          <p className="text-white/55 text-base max-w-2xl mx-auto leading-relaxed">
            AWS Student Builder Group at JDIET is open for{' '}
            <span className="text-white/80 font-medium">anyone interested in learning cloud technology</span>{' '}
            — regardless of branch, year, or background. Yavatmal's first global student-led cloud community.
          </p>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* Left — Founder card + contact */}
          <div className="space-y-5">

            {/* Founder */}
            <div className="liquid-glass rounded-2xl p-6 border border-white/8 hover:border-white/15 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center shadow-[0_0_18px_rgba(124,58,237,0.35)] flex-shrink-0">
                  <User size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Pranav Shinde</p>
                  <p className="text-white/40 text-xs">Founder · AWS Student Builder Group at JDIET</p>
                </div>
              </div>
              <blockquote className="text-white/60 text-sm leading-relaxed border-l-2 border-[#7C3AED]/50 pl-4">
                "We built this community so every student in Yavatmal can access the same world-class cloud learning opportunities as anyone, anywhere."
              </blockquote>
            </div>

            {/* Contact */}
            <div className="liquid-glass rounded-2xl p-6 border border-white/8 hover:border-white/15 transition-all duration-300">
              <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-5">Get in Touch</p>

              <div className="space-y-4">
                <a href="tel:+919156332109" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#00CFFF]/40 group-hover:bg-[#00CFFF]/8 transition-all flex-shrink-0">
                    <Phone size={15} className="text-white/60 group-hover:text-[#00CFFF] transition-colors" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium group-hover:text-[#00CFFF] transition-colors">+91 91563 32109</p>
                    <p className="text-white/35 text-xs">AWS Student Builder Group Lead</p>
                  </div>
                </a>

                <a href="https://swarajyahackfest.vercel.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#00CFFF]/40 group-hover:bg-[#00CFFF]/8 transition-all flex-shrink-0">
                    <Globe size={15} className="text-white/60 group-hover:text-[#00CFFF] transition-colors" />
                  </div>
                  <div>
                    <p className="text-[#00CFFF] text-sm font-medium group-hover:underline">swarajyahackfest.vercel.app</p>
                    <p className="text-white/35 text-xs">Official Website</p>
                  </div>
                </a>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <MapPin size={15} className="text-white/60" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Yavatmal, Maharashtra</p>
                    <p className="text-white/35 text-xs">JDIET · Yavatmal's First Global Cloud Community</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Social icons: 1 row on all screens */}
          <div className="flex flex-col justify-center h-full">
            <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-5 text-center lg:text-left">Follow & Join</p>

            {/* 4 icons always in one row */}
            <div className="grid grid-cols-4 gap-3">
              {SOCIAL_LINKS.map(({ label, handle, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="group flex flex-col items-center gap-2.5 liquid-glass rounded-2xl py-5 px-2 border border-white/8 hover:border-white/20 hover:bg-white/5 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Icon */}
                  <span className="text-white/70 group-hover:text-white transition-colors duration-300 group-hover:scale-110 inline-block transform">
                    {icon}
                  </span>
                  {/* Label */}
                  <span className="text-white/60 text-[10px] font-medium group-hover:text-white/90 transition-colors text-center leading-tight">
                    {label}
                  </span>
                  {/* Handle */}
                  <span className="text-white/30 text-[9px] text-center leading-tight hidden sm:block">
                    {handle}
                  </span>
                </a>
              ))}
            </div>

            {/* Subtle bottom note */}
            <p className="text-white/25 text-xs text-center mt-5">
              Click any icon to connect with the community
            </p>
          </div>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-[#00CFFF]/25 to-transparent" />
    </section>
  );
}
