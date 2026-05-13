import { Link } from 'react-router-dom';

interface LogoBrandProps {
  /** 'sm' = navbar, 'md' = footer, 'lg' = hero / large display */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Wrap in a Link to "/" by default; pass false to render a plain div */
  linked?: boolean;
}

export default function LogoBrand({ size = 'sm', className = '', linked = true }: LogoBrandProps) {
  const logoSize   = size === 'lg' ? 'h-16 w-16' : size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  const titleSize  = size === 'lg' ? 'text-2xl sm:text-3xl' : size === 'md' ? 'text-lg' : 'text-sm';
  const subSize    = size === 'lg' ? 'text-base sm:text-lg' : size === 'md' ? 'text-sm' : 'text-xs';
  const gap        = size === 'lg' ? 'gap-4' : 'gap-2.5';

  const inner = (
    <span className={`flex items-center ${gap} group ${className}`}>
      {/* Chip logo — white drop-shadow glow on hover */}
      <img
        src="/logo.png"
        alt="AWS Student Builder Group at JDIET"
        className={`${logoSize} object-contain flex-shrink-0 group-hover:drop-shadow-[0_0_10px_rgba(0,207,255,0.7)] transition-all duration-300`}
      />

      {/* Text block — always left-aligned, stacked */}
      <span className="flex flex-col leading-tight">
        <span
          className={`font-bold text-white tracking-tight ${titleSize}`}
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          AWS Student Builder Group
        </span>
        <span
          className={`font-medium ${subSize}`}
          style={{ color: '#00CFFF', fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          at JDIET
        </span>
      </span>
    </span>
  );

  if (linked) {
    return <Link to="/">{inner}</Link>;
  }
  return <div>{inner}</div>;
}
