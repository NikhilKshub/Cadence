import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { createPortal } from 'react-dom';

interface HeartParticle {
  id: number;
  left: number; // percentage
  scale: number;
  duration: number; // ms
  delay: number; // ms
}

export default function GlobalLikeAnimation() {
  const [particles, setParticles] = useState<HeartParticle[]>([]);

  useEffect(() => {
    const handleSpawn = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const particleCount = Math.floor(Math.random() * 5) + 4; // 4 to 8 hearts
      const newParticles: HeartParticle[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: timestamp + i,
          left: 10 + Math.random() * 80, // 10% to 90% across the screen width
          scale: 1 + Math.random() * 1.5, // 1x to 2.5x base size
          duration: 2500 + Math.random() * 1500, // 2500ms to 4000ms
          delay: Math.random() * 150, // Slight stagger
        });
      }

      setParticles((prev) => [...prev, ...newParticles]);

      // Cleanup particles after longest possible animation duration
      setTimeout(() => {
        setParticles((prev) => prev.filter(p => p.id < timestamp));
      }, 5000); 
    };

    window.addEventListener('spawn-like-animation', handleSpawn);
    return () => window.removeEventListener('spawn-like-animation', handleSpawn);
  }, []);

  if (particles.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <style>{`
        @keyframes floatUpFade {
          0% {
            transform: translateY(20vh) scale(var(--scale));
            opacity: 0;
            filter: blur(8px) drop-shadow(0 0 10px rgba(232,99,10,0));
          }
          15% {
            opacity: 0.6;
            filter: blur(2px) drop-shadow(0 0 20px rgba(232,99,10,0.6));
          }
          80% {
            opacity: 0.4;
            filter: blur(6px) drop-shadow(0 0 30px rgba(232,99,10,0.4));
          }
          100% {
            transform: translateY(-80vh) scale(var(--scale));
            opacity: 0;
            filter: blur(12px) drop-shadow(0 0 10px rgba(232,99,10,0));
          }
        }
      `}</style>
      {particles.map(p => (
        <Heart
          key={p.id}
          className="absolute bottom-0 text-[#E8630A] fill-[#E8630A]"
          style={{
            left: `${p.left}%`,
            '--scale': p.scale,
            animation: `floatUpFade ${p.duration}ms ease-out ${p.delay}ms both`,
            width: '48px',
            height: '48px',
            willChange: 'transform, opacity, filter',
          } as React.CSSProperties}
        />
      ))}
    </div>,
    document.body
  );
}
