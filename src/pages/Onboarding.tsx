import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Music2, Mic2, Radio, FolderOpen, CheckCircle2 } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [folder, setFolder] = useState<string | null>(null);

  const songCount = useLibraryStore((s) => s.songs.length);

  const handleChooseFolder = async () => {
    try {
      const path = await invoke<string | null>('open_folder_dialog');
      if (path) {
        setFolder(path);
        await useLibraryStore.getState().addMusicFolder(path);
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  };

  const handleFinish = () => {
    useSettingsStore.getState().updateSettings({
      hasCompletedOnboarding: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-[#0D0D0D] overflow-hidden">
      {/* DRAG REGION */}
      <div 
        data-tauri-drag-region 
        className="w-full h-[40px] shrink-0 absolute top-0 left-0 z-50 cursor-grab active:cursor-grabbing"
      />
      
      {/* AMBIENT BACKGROUND */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 800px 600px at 50% 40%, rgba(232,99,10,0.06) 0%, transparent 70%)'
        }}
      />

      {/* STEP INDICATOR */}
      <div className="relative z-10 flex flex-row gap-2 justify-center mt-[40px]">
        {[1, 2, 3].map((s) => {
          let stateStyle = "w-[8px] h-[8px] bg-[rgba(255,255,255,0.12)]"; // UPCOMING
          if (s === step) {
            stateStyle = "w-[32px] h-[8px] bg-[#E8630A]"; // ACTIVE
          } else if (s < step) {
            stateStyle = "w-[8px] h-[8px] bg-[rgba(232,99,10,0.4)]"; // COMPLETED
          }
          return (
            <div 
              key={s} 
              className={`rounded-[4px] transition-all duration-300 ease-in-out ${stateStyle}`} 
            />
          );
        })}
      </div>

      {/* CONTENT AREA */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="w-[520px] max-w-full px-6 flex flex-col items-center">
          
          <style>{`
            @keyframes slideIn {
              from { opacity: 0; transform: translateX(30px); }
              to { opacity: 1; transform: translateX(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              25% { transform: translateY(-8px); }
              50% { transform: translateY(0); }
              75% { transform: translateY(8px); }
            }
            @keyframes bounceIn {
              from { transform: scale(0); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes shine {
              0% { background-position: -200% center; }
              100% { background-position: 200% center; }
            }
            @keyframes blobRotate {
              0% { transform: rotate(0deg) scale(1); }
              33% { transform: rotate(120deg) scale(1.1); }
              66% { transform: rotate(240deg) scale(0.9); }
              100% { transform: rotate(360deg) scale(1); }
            }
            @keyframes blobPulse {
              0%, 100% { opacity: 0.15; }
              50% { opacity: 0.3; }
            }
          `}</style>

          {/* ─── STEP 1: Welcome ──────────────────────── */}
          {step === 1 && (
            <div 
              key="step1" 
              className="relative flex flex-col items-center w-full"
              style={{ animation: 'slideIn 300ms ease-out forwards' }}
            >
              {/* Decorative Animated Glow Behind Logo */}
              <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full mix-blend-screen pointer-events-none"
                   style={{
                     background: 'radial-gradient(circle, rgba(232,99,10,0.4) 0%, transparent 70%)',
                     animation: 'blobRotate 10s linear infinite, blobPulse 4s ease-in-out infinite'
                   }} 
              />
              <div className="absolute top-[-20px] left-1/2 -translate-x-[60%] w-[150px] h-[150px] rounded-full mix-blend-screen pointer-events-none"
                   style={{
                     background: 'radial-gradient(circle, rgba(255,140,66,0.4) 0%, transparent 70%)',
                     animation: 'blobRotate 8s linear infinite reverse, blobPulse 6s ease-in-out infinite'
                   }} 
              />

              {/* Icon */}
              <div 
                className="relative z-10 w-[84px] h-[84px] rounded-[22px] flex items-center justify-center border border-[rgba(232,99,10,0.3)] shadow-[0_0_32px_rgba(232,99,10,0.25)]"
                style={{ 
                  background: 'linear-gradient(135deg, #1C1C1C 0%, #2A2520 100%)',
                  animation: 'fadeIn 400ms ease-out forwards'
                }}
              >
                <div style={{ animation: 'float 6s ease-in-out infinite' }}>
                  <img src="/logo.png" alt="Cadence Logo" className="w-[64px] h-[64px] object-contain drop-shadow-[0_0_12px_rgba(232,99,10,0.8)]" />
                </div>
              </div>

              {/* Brand Wordmark */}
              <div style={{ animation: 'fadeIn 400ms ease-out forwards 50ms', opacity: 0, animationFillMode: 'forwards' }}>
                <h2
                  className="relative z-10 font-display text-[32px] font-[900] tracking-[-0.02em] text-transparent bg-clip-text text-center mt-[8px]"
                  style={{ 
                    backgroundImage: 'linear-gradient(to right, #F5F0EB 20%, #FF8C42 50%, #F5F0EB 80%)',
                    backgroundSize: '200% auto',
                    animation: 'shine 4s linear infinite', 
                  }}
                >
                  Cadence
                </h2>
              </div>

              {/* Heading */}
              <h1 
                className="font-display text-[44px] font-[900] text-[#F5F0EB] tracking-[-0.03em] leading-[1.1] text-center mt-[16px]"
                style={{ animation: 'fadeIn 400ms ease-out forwards 100ms', opacity: 0, animationFillMode: 'forwards' }}
              >
                Your music.<br/>
                <span className="text-[#E8630A]">Your way.</span>
              </h1>

              {/* Subtext */}
              <p 
                className="font-body text-[16px] text-[#9A9080] leading-[1.6] text-center max-w-[380px] mx-auto mt-[16px]"
                style={{ animation: 'fadeIn 400ms ease-out forwards 200ms', opacity: 0, animationFillMode: 'forwards' }}
              >
                A premium offline music experience for Windows. Beautiful, fast, and yours.
              </p>

              {/* Features */}
              <div 
                className="flex flex-col gap-3 mt-[32px] w-[260px]"
                style={{ animation: 'fadeIn 400ms ease-out forwards 300ms', opacity: 0, animationFillMode: 'forwards' }}
              >
                {[
                  { icon: Music2, text: 'Play MP3, FLAC, WAV and more' },
                  { icon: Mic2, text: 'Synced lyrics and album art' },
                  { icon: Radio, text: 'Last.fm, Discord and more' }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-row items-center gap-3">
                    <div className="w-[32px] h-[32px] rounded-[8px] bg-[rgba(232,99,10,0.10)] flex items-center justify-center shrink-0">
                      <item.icon size={16} color="#E8630A" />
                    </div>
                    <span className="font-body text-[14px] text-[#9A9080]">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => setStep(2)}
                className="w-full h-[52px] mt-[40px] bg-[#E8630A] hover:bg-[#FF8C42] rounded-[26px] font-display text-[16px] font-[700] text-white tracking-[-0.01em] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[2px] hover:shadow-[0_16px_48px_rgba(232,99,10,0.35)] active:translate-y-[0] active:scale-[0.99]"
                style={{ animation: 'fadeIn 400ms ease-out forwards 400ms', opacity: 0, animationFillMode: 'forwards' }}
              >
                Get Started
              </button>
            </div>
          )}

          {/* ─── STEP 2: Add Music ────────────────────── */}
          {step === 2 && (
            <div 
              key="step2" 
              className="flex flex-col w-full"
              style={{ animation: 'slideIn 300ms ease-out forwards' }}
            >
              <div className="flex flex-col items-center w-full">
                {/* Icon */}
                <div 
                  className="w-[96px] h-[96px] rounded-[24px] flex items-center justify-center border border-[rgba(232,99,10,0.2)] shadow-[0_0_48px_rgba(232,99,10,0.15)]"
                  style={{ 
                    background: 'linear-gradient(135deg, #1C1C1C 0%, #2A2520 100%)',
                    animation: 'fadeIn 400ms ease-out forwards'
                  }}
                >
                  <div style={{ animation: 'float 6s ease-in-out infinite' }}>
                    <FolderOpen size={48} color="#E8630A" />
                  </div>
                </div>

                {/* Heading */}
                <h1 
                  className="font-display text-[40px] font-[800] tracking-[-0.02em] text-[#F5F0EB] text-center mt-[32px] leading-[1.1]"
                  style={{ animation: 'fadeIn 400ms ease-out forwards 100ms', opacity: 0, animationFillMode: 'forwards' }}
                >
                  Where is your<br/>
                  <span className="text-[#E8630A]">music?</span>
                </h1>

                {/* Subtext */}
                <p 
                  className="font-body text-[15px] text-[#9A9080] text-center max-w-[360px] mx-auto mt-[16px] leading-[1.5]"
                  style={{ animation: 'fadeIn 400ms ease-out forwards 200ms', opacity: 0, animationFillMode: 'forwards' }}
                >
                  Choose a folder with your music files. Cadence supports MP3, FLAC, WAV, OGG, AAC and M4A formats.
                </p>

                {/* Drop Zone */}
                <div 
                  onClick={handleChooseFolder}
                  className={`w-full mt-[28px] border-[2px] border-dashed rounded-[16px] p-[32px] text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
                    folder 
                      ? 'border-[#E8630A] bg-[rgba(232,99,10,0.05)]' 
                      : 'border-[rgba(255,255,255,0.10)] hover:border-[#E8630A] hover:bg-[rgba(232,99,10,0.05)]'
                  }`}
                  style={{ animation: 'fadeIn 400ms ease-out forwards 300ms', opacity: 0, animationFillMode: 'forwards' }}
                >
                  {!folder ? (
                    <>
                      <FolderOpen size={36} color="#3A3530" className="mb-[12px]" />
                      <span className="font-body text-[14px] text-[#5A5248]">Click to choose folder</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={36} color="#E8630A" className="mb-[12px]" />
                      <span className="font-body text-[13px] text-[#9A9080] truncate max-w-[300px]">{folder}</span>
                      <span className="font-body text-[14px] font-[600] text-[#E8630A] mt-[8px]">
                        {songCount} songs found
                      </span>
                    </>
                  )}
                </div>

                {/* Bottom Row */}
                <div 
                  className="flex flex-row items-center justify-between w-full mt-[24px]"
                  style={{ animation: 'fadeIn 400ms ease-out forwards 400ms', opacity: 0, animationFillMode: 'forwards' }}
                >
                  <button 
                    onClick={() => setStep(3)}
                    className="font-body text-[13px] text-[#5A5248] hover:text-[#9A9080] hover:underline transition-all"
                  >
                    Skip for now
                  </button>
                  <button 
                    onClick={() => setStep(3)}
                    disabled={!folder && songCount === 0}
                    className="h-[44px] px-[28px] bg-[#E8630A] rounded-[22px] font-display text-[14px] font-[700] text-white disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-[#FF8C42] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Ready ──────────────────────── */}
          {step === 3 && (
            <div 
              key="step3" 
              className="flex flex-col items-center w-full"
              style={{ animation: 'slideIn 300ms ease-out forwards' }}
            >
              {/* Icon */}
              <div className="relative w-[120px] h-[120px] flex items-center justify-center mt-[20px]">
                {/* Glow */}
                <div 
                  className="absolute w-[120px] h-[120px] bg-[rgba(232,99,10,0.12)] rounded-full"
                  style={{ animation: 'bounceIn 600ms cubic-bezier(0.34,1.56,0.64,1) forwards' }}
                />
                <div style={{ animation: 'bounceIn 600ms cubic-bezier(0.34,1.56,0.64,1) forwards 100ms', opacity: 0, animationFillMode: 'forwards' }}>
                  <CheckCircle2 size={64} color="#E8630A" className="relative z-10" />
                </div>
              </div>

              {/* Heading */}
              <h1 
                className="font-display text-[40px] font-[800] text-[#F5F0EB] tracking-[-0.02em] text-center mt-[24px]"
                style={{ animation: 'fadeIn 400ms ease-out forwards 200ms', opacity: 0, animationFillMode: 'forwards' }}
              >
                You are all set!
              </h1>

              {/* Subtext */}
              <p 
                className="font-body text-[15px] text-[#9A9080] text-center mt-[8px]"
                style={{ animation: 'fadeIn 400ms ease-out forwards 300ms', opacity: 0, animationFillMode: 'forwards' }}
              >
                Cadence is ready. Enjoy your music.
              </p>

              {/* Pill Badge */}
              {songCount > 0 && (
                <div 
                  className="bg-[rgba(232,99,10,0.10)] border border-[rgba(232,99,10,0.2)] rounded-[20px] px-[16px] py-[6px] mt-[16px]"
                  style={{ animation: 'fadeIn 400ms ease-out forwards 400ms', opacity: 0, animationFillMode: 'forwards' }}
                >
                  <span className="font-body text-[13px] font-[600] text-[#E8630A]">
                    Added {songCount} songs to your library
                  </span>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleFinish}
                className="w-full h-[52px] mt-[32px] bg-[#E8630A] hover:bg-[#FF8C42] rounded-[26px] font-display text-[16px] font-[700] text-white tracking-[-0.01em] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[2px] hover:shadow-[0_16px_48px_rgba(232,99,10,0.35)] active:translate-y-[0] active:scale-[0.99]"
                style={{ animation: 'fadeIn 400ms ease-out forwards 500ms', opacity: 0, animationFillMode: 'forwards' }}
              >
                Start Listening &rarr;
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
