// Cadence — Modal dialog component
// Renders an overlay modal with backdrop, controlled by parent state

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        animation: 'modalFadeIn 200ms ease-out',
      }}
    >
      <div
        className={className}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          backgroundColor: '#141414',
          borderRadius: '12px',
          border: '1px solid #2a2a2a',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          maxHeight: '85vh',
          overflowY: 'auto',
          animation: 'modalSlideUp 250ms ease-out',
        }}
      >
        {title && (
          <div style={{
            padding: '16px 20px 12px',
            borderBottom: '1px solid #2a2a2a',
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#ffffff',
              margin: 0,
            }}>{title}</h2>
          </div>
        )}
        <div>{children}</div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
