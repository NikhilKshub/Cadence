// Cadence — Sleep Timer Modal
// Lets the user schedule automatic playback stop after N minutes.

import { useState } from 'react';
import { Moon, X } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
];

export default function SleepTimerModal({ isOpen, onClose }: SleepTimerModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState(30);

  const sleepTimer = usePlayerStore((s) => s.sleepTimer);
  const startSleepTimer = usePlayerStore((s) => s.startSleepTimer);
  const stopSleepTimer = usePlayerStore((s) => s.stopSleepTimer);

  if (!isOpen) return null;

  const handlePreset = (minutes: number) => {
    setIsCustom(false);
    setSelectedMinutes(minutes);
  };

  const handleCustomSelect = () => {
    setIsCustom(true);
    setSelectedMinutes(customValue);
  };

  const handleCustomChange = (val: number) => {
    const clamped = Math.max(1, Math.min(480, val));
    setCustomValue(clamped);
    setSelectedMinutes(clamped);
  };

  const handleStart = () => {
    const mins = isCustom ? customValue : selectedMinutes;
    if (mins && mins > 0) {
      startSleepTimer(mins);
      onClose();
    }
  };

  const handleCancel = () => {
    stopSleepTimer();
  };

  const handleClose = () => {
    setSelectedMinutes(null);
    setIsCustom(false);
    onClose();
  };

  const remaining = sleepTimer.minutesRemaining;
  const remainingText =
    remaining !== null
      ? remaining >= 60
        ? `${Math.floor(remaining / 60)}h ${remaining % 60}m remaining`
        : `${remaining} minute${remaining !== 1 ? 's' : ''} remaining`
      : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative w-[320px] rounded-2xl bg-[#161616] border border-[#2a2a2a] p-6 shadow-2xl shadow-black/60 animate-scale-in">

        {/* Close button */}
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#6b6b6b] transition-colors duration-150 hover:text-white"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c3aed]/15">
            <Moon size={20} className="text-[#7c3aed]" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold text-white">Sleep Timer</h2>
            <p className="text-[12px] text-[#6b6b6b]">Stop playback automatically</p>
          </div>
        </div>

        {/* Active timer state */}
        {sleepTimer.isActive ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7c3aed]/10 ring-1 ring-[#7c3aed]/30">
              <Moon size={28} className="text-[#a78bfa]" />
            </div>
            <div className="text-center">
              <p className="text-[22px] font-semibold text-[#a78bfa]">{remainingText}</p>
              <p className="mt-1 text-[12px] text-[#6b6b6b]">Music will stop when the timer ends</p>
            </div>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={handleCancel}
              className="mt-1 w-full rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 py-2.5 text-[14px] font-medium text-[#ef4444] transition-all duration-150 hover:bg-[#ef4444]/20 hover:border-[#ef4444]/70"
            >
              Cancel Timer
            </button>
          </div>
        ) : (
          <>
            {/* Preset grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PRESETS.map((preset) => {
                const isSelected = !isCustom && selectedMinutes === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handlePreset(preset.minutes)}
                    className={`rounded-xl border py-3 text-[14px] font-medium transition-all duration-150 ${
                      isSelected
                        ? 'border-transparent bg-[#7c3aed] text-white'
                        : 'border-[#2a2a2a] bg-[#1f1f1f] text-white hover:border-[#7c3aed]/50 hover:bg-[#1a1a2e]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {/* Custom button */}
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={handleCustomSelect}
                className={`rounded-xl border py-3 text-[14px] font-medium transition-all duration-150 ${
                  isCustom
                    ? 'border-transparent bg-[#7c3aed] text-white'
                    : 'border-[#2a2a2a] bg-[#1f1f1f] text-white hover:border-[#7c3aed]/50 hover:bg-[#1a1a2e]'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom input */}
            {isCustom && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#1f1f1f] px-4 py-2.5">
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={customValue}
                  onChange={(e) => handleCustomChange(Number(e.target.value))}
                  className="w-full bg-transparent text-center text-[16px] font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="shrink-0 text-[13px] text-[#a3a3a3]">minutes</span>
              </div>
            )}

            {/* Start button */}
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={handleStart}
              disabled={selectedMinutes === null}
              className={`mt-1 w-full rounded-xl py-3 text-[14px] font-semibold transition-all duration-150 ${
                selectedMinutes !== null
                  ? 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]'
                  : 'cursor-not-allowed bg-[#1f1f1f] text-[#4a4a4a]'
              }`}
            >
              Start Timer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
