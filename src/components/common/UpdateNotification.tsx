// Cadence — Update Notification Component
// Displays an unobtrusive banner when a new version is available

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Sparkles, Download, CheckCircle2 } from 'lucide-react';

type UpdateState = 'idle' | 'available' | 'downloading' | 'restart';

interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
  date?: string;
}

export default function UpdateNotification() {
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Only check for updates once per session via this component
    // App.tsx handles the actual check with a delay, but we'll also
    // listen for state changes if needed. Actually the instructions said:
    // On component mount check for updates:
    // Wait, the prompt said "ADD to App.tsx: After 5 seconds delay, check for updates"
    // AND "On component mount check for updates" in UpdateNotification.tsx.
    // I will just do it here to ensure it's self-contained, but to follow instructions exactly:
    
    // We'll let App.tsx handle the delayed check, or we can just do the check here.
    // Let's do the check here but App.tsx also has a setTimeout. 
    // Wait, the instructions said:
    // On component mount check for updates:
    // useEffect(() => {
    //   invoke('check_for_updates').then((result: any) => { ... })
    // }, [])
    // AND 
    // In App.tsx useEffect on mount:
    // After 5 seconds delay, check for updates:
    // setTimeout(() => { invoke('check_for_updates').catch(() => {}) }, 5000)
    // Wait, if I check immediately in UpdateNotification, the App.tsx delay is redundant.
    // But I must follow instructions.
  }, []);

  // Actually, I'll put the check in useEffect here as instructed
  useEffect(() => {
    invoke('check_for_updates').then((result: any) => {
      if (result.available) {
        setUpdateInfo(result);
        setUpdateState('available');
      }
    }).catch(() => {});
  }, []);

  const handleUpdateNow = () => {
    setUpdateState('downloading');
    
    const unlisten = listen('update-progress', (e: any) => {
      setProgress(e.payload.percent);
    });
    
    invoke('install_update')
      .then(() => setUpdateState('restart'))
      .catch(() => setUpdateState('available'))
      .finally(async () => {
        (await unlisten)();
      });
  };

  const handleRestart = () => {
    invoke('restart_app').catch(() => {});
  };

  const handleLater = () => {
    setUpdateState('idle');
  };

  if (updateState === 'idle') return null;

  return (
    <div className="relative w-full z-40 bg-gradient-to-r from-[#1a1a2e] to-[#0f0f2e] border-b border-[#7c3aed] overflow-hidden animate-slide-down">
      <div className="px-4 py-2 flex items-center justify-between">
        
        {/* Left content */}
        <div className="flex items-center gap-3">
          {updateState === 'available' && (
            <Sparkles className="w-4 h-4 text-[#7c3aed]" />
          )}
          {updateState === 'downloading' && (
            <Download className="w-4 h-4 text-[#7c3aed] animate-bounce" />
          )}
          {updateState === 'restart' && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
          
          <div className="flex items-center gap-2">
            {updateState === 'available' && (
              <>
                <span className="text-white text-[13px] font-medium">
                  Cadence {updateInfo?.version} is available
                </span>
                <span className="text-[#a3a3a3] text-[12px]">
                  {updateInfo?.notes ? updateInfo.notes.substring(0, 40) + '...' : 'Release notes available'}
                </span>
              </>
            )}
            
            {updateState === 'downloading' && (
              <>
                <span className="text-white text-[13px] font-medium">
                  Downloading update...
                </span>
                <span className="text-[#a3a3a3] text-[12px]">
                  {Math.round(progress)}%
                </span>
              </>
            )}

            {updateState === 'restart' && (
              <span className="text-white text-[13px] font-medium">
                Update ready — restart to apply
              </span>
            )}
          </div>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-3">
          {updateState === 'available' && (
            <button
              onClick={handleUpdateNow}
              className="px-3 py-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[12px] font-medium rounded transition-colors"
            >
              Update Now
            </button>
          )}
          
          {updateState === 'restart' && (
            <button
              onClick={handleRestart}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[12px] font-medium rounded transition-colors"
            >
              Restart Now
            </button>
          )}

          {(updateState === 'available' || updateState === 'restart') && (
            <button
              onClick={handleLater}
              className="text-[#6b6b6b] hover:text-white text-[12px] transition-colors"
            >
              Later
            </button>
          )}
        </div>
      </div>

      {/* Progress bar at the bottom */}
      {updateState === 'downloading' && (
        <div className="absolute bottom-0 left-0 h-[2px] bg-[#2a2a2a] w-full">
          <div 
            className="h-full bg-[#7c3aed] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
