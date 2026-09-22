import { useState } from 'react';
import { Shield } from 'lucide-react';

interface LogoProps {
  size?: number; // icon size when fallback
  className?: string; // extra class for wrapper
  iconClassName?: string; // extra class for Shield fallback icon
  withBackground?: boolean; // show gold gradient background wrapper like before
  bgClassName?: string; // Tailwind class for background size, e.g., w-9 h-9 rounded-xl
  alt?: string;
}

/**
 * Central Logo Component - Change logo from ONE place: public/logo.svg or public/logo.png
 * 
 * How to change logo:
 * 1. Put your logo file in public/ folder as logo.svg (preferred) or logo.png
 * 2. It will automatically appear everywhere - Navbar, Auth, Dashboard, Workspace, etc.
 * 3. If logo.svg fails to load, it tries logo.png, then falls back to Shield icon
 * 
 * Supported: public/logo.svg, public/logo.png, public/logo.jpg
 */
export default function Logo({ 
  size = 18, 
  className = '', 
  iconClassName = '', 
  withBackground = true, 
  bgClassName = 'w-9 h-9 rounded-xl',
  alt = 'CodeGuard AI Logo'
}: LogoProps) {
  const [stage, setStage] = useState<'svg' | 'png' | 'fallback'>('svg');

  if (stage === 'fallback') {
    if (withBackground) {
      return (
        <div className={`${bgClassName} bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 ${className}`}>
          <Shield size={size} className={`text-[#0A0A0A] ${iconClassName}`} strokeWidth={2.5} />
        </div>
      );
    }
    return <Shield size={size} className={`text-[#D4AF37] ${iconClassName} ${className}`} strokeWidth={2.5} />;
  }

  const src = stage === 'svg' ? '/logo.svg' : '/logo.png';

  const handleError = () => {
    if (stage === 'svg') setStage('png');
    else setStage('fallback');
  };

  // Custom logo found - show it clean, without gold background
  if (withBackground) {
    return (
      <div className={`${bgClassName} bg-white/[0.03] border border-white/[0.06] flex items-center justify-center overflow-hidden backdrop-blur-xl ${className}`}>
        <img
          src={src}
          alt={alt}
          onError={handleError}
          className="w-full h-full object-contain p-1"
        />
      </div>
    );
  }

  // Without background - just logo image
  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      className={`object-contain ${className}`}
      style={{ width: size * 1.8, height: size * 1.8 }}
    />
  );
}
