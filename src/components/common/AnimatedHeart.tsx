import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';

interface AnimatedHeartProps {
  isLiked: boolean;
  onClick: () => void;
  className?: string;
  size?: number;
}

export default function AnimatedHeart({ isLiked, onClick, className = "", size = 18 }: AnimatedHeartProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevIsLiked = useRef(isLiked);

  useEffect(() => {
    const justLiked = !prevIsLiked.current && isLiked;
    prevIsLiked.current = isLiked;

    if (!justLiked) {
      setIsAnimating(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion) {
      setIsAnimating(true);
      
      // Dispatch global animation event
      window.dispatchEvent(new CustomEvent('spawn-like-animation'));

      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 450); // Matches the new pulse duration
      return () => clearTimeout(timer);
    }
  }, [isLiked]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <style>{`
        @keyframes heartPulseAnim {
          0% { transform: scale(1); filter: drop-shadow(0 0 0px transparent); }
          50% { transform: scale(1.25); filter: drop-shadow(0 0 12px rgba(232,99,10,0.6)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0px transparent); }
        }
      `}</style>

      {/* Main Heart Button */}
      <button 
        onMouseDown={e => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="relative z-10 w-full h-full flex items-center justify-center outline-none group"
        style={{
          animation: isAnimating 
            ? 'heartPulseAnim 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
            : 'none'
        }}
      >
        <Heart 
          size={size} 
          className={`transition-colors duration-200 ${
            isLiked 
              ? 'fill-[#E8630A] text-[#E8630A]' 
              : 'text-[#5A5248] group-hover:text-[#9A9080]'
          }`} 
        />
      </button>
    </div>
  );
}
