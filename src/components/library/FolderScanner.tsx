import React from 'react';
import { FolderOpen, CheckCircle2, RefreshCw } from 'lucide-react';

interface FolderScannerProps {
  isScanning: boolean;
  scanProgress: number;
  scannedCount: number;
  hasCompletedScan: boolean;
  onSelectFolder: () => void;
  onFinish: () => void;
  onCancel?: () => void;
}

export const FolderScanner: React.FC<FolderScannerProps> = ({
  isScanning,
  scanProgress,
  scannedCount,
  hasCompletedScan,
  onSelectFolder,
  onFinish,
  onCancel,
}) => {
  return (
    <div className="w-full max-w-2xl bg-[#161616] border border-[#2a2a2a] rounded-[12px] p-10 shadow-xl relative overflow-hidden transition-all duration-300 ease-in-out">
      {/* Background Neon Glow Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-[#7c3aed]/10 blur-[50px] pointer-events-none" />

      <div className="relative min-h-[280px] flex flex-col items-center justify-center">
        {/* STATE 1: IDLE */}
        {!isScanning && !hasCompletedScan && (
          <div className="w-full flex flex-col items-center justify-center animate-fade-in">
            <div
              onClick={onSelectFolder}
              className="w-full border-2 border-dashed border-[#2a2a2a] hover:border-[#7c3aed]/50 rounded-[12px] flex flex-col items-center justify-center p-8 bg-black/20 hover:bg-black/40 cursor-pointer group transition-all duration-250 ease-in-out"
            >
              <div className="w-16 h-16 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center mb-6 group-hover:bg-[#7c3aed]/10 group-hover:border-[#7c3aed]/30 transition-all duration-250 ease-in-out">
                <FolderOpen className="w-8 h-8 text-[#a3a3a3] group-hover:text-[#a78bfa] transition-colors duration-250" />
              </div>
              <h3 className="font-sans text-[22px] font-semibold text-[#f5f5f5] mb-2">
                Add Music Folder
              </h3>
              <p className="text-[#a3a3a3] text-[14px] mb-6 text-center">
                Click to select a folder or drag and drop
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFolder();
                }}
                className="bg-[#7c3aed] hover:bg-[#6d31d1] text-white px-6 py-2.5 rounded-[8px] font-semibold transition-all duration-250 active:scale-95 shadow-lg shadow-[#7c3aed]/20"
              >
                Choose Folder
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: SCANNING */}
        {isScanning && (
          <div className="w-full flex flex-col items-center justify-center animate-fade-in">
            <div className="relative w-20 h-20 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center mb-6">
              {/* Pulsing ring animation */}
              <div className="absolute inset-0 rounded-full bg-[#7c3aed] opacity-10 animate-ping" />
              <RefreshCw className="w-9 h-9 text-[#a78bfa] animate-spin" />
            </div>

            <h3 className="font-sans text-[22px] font-semibold text-[#f5f5f5] mb-2">
              Scanning your music library...
            </h3>
            <p className="text-[#a3a3a3] text-[15px] mb-6">
              Found {scannedCount} songs so far
            </p>

            <div className="w-full max-w-md bg-[#1c1c1c] rounded-full h-2.5 mb-2 overflow-hidden border border-[#2a2a2a]">
              <div
                className="bg-[#7c3aed] h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${scanProgress}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
              </div>
            </div>

            <div className="w-full max-w-md flex justify-end mb-8">
              <span className="text-[12px] font-bold text-[#a78bfa]">
                {Math.round(scanProgress)}%
              </span>
            </div>

            {onCancel && (
              <button
                onClick={onCancel}
                className="border border-[#2a2a2a] hover:border-[#3a3a3a] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#1c1c1c] px-6 py-2 rounded-[8px] font-semibold transition-all duration-250 active:scale-95"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* STATE 3: COMPLETE */}
        {!isScanning && hasCompletedScan && (
          <div className="w-full flex flex-col items-center justify-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <CheckCircle2 className="w-10 h-10 text-[#22c55e]" />
            </div>

            <h3 className="font-sans text-[22px] font-semibold text-[#f5f5f5] mb-2 text-center">
              Library scan complete
            </h3>
            <p className="text-[#22c55e] text-[15px] mb-8 text-center">
              Added {scannedCount} songs to your library
            </p>

            <button
              onClick={onFinish}
              className="bg-[#7c3aed] hover:bg-[#6d31d1] text-white px-8 py-2.5 rounded-[8px] font-semibold transition-all duration-250 active:scale-95 shadow-lg shadow-[#7c3aed]/20"
            >
              Scan Another Folder
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-[shimmer_1.5s_infinite] {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
};
