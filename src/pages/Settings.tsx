// Cadence — Settings page
// Application preferences and configuration

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Settings2, FolderOpen, Music2, Palette, Radio,
  MessageSquare, Info, X, Eye, EyeOff, FolderPlus,
  RefreshCw, Trash2, ExternalLink, Check
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useLibraryStore } from '../store/libraryStore';
import { useUiStore } from '../store/uiStore';
import { usePlayerStore } from '../store/playerStore';
import { applyAccentColor } from '../utils/colorExtractor';

type SettingsCategory = 'general' | 'library' | 'playback' | 'appearance' | 'lastfm' | 'discord' | 'about';

const CATEGORIES: { id: SettingsCategory; label: string; icon: any }[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'library', label: 'Library', icon: FolderOpen },
  { id: 'playback', label: 'Playback', icon: Music2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'lastfm', label: 'Last.fm', icon: Radio },
  { id: 'discord', label: 'Discord', icon: MessageSquare },
  { id: 'about', label: 'About', icon: Info },
];

const ACCENT_PRESETS = ['#7c3aed', '#2563eb', '#dc2626', '#16a34a', '#d97706', '#db2777'];

// ─── Reusable Toggle ────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
      style={{ backgroundColor: checked ? '#7c3aed' : '#2a2a2a' }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200"
        style={{ transform: checked ? 'translateX(22px) translateY(2px)' : 'translateX(2px) translateY(2px)' }}
      />
    </button>
  );
}

// ─── Reusable setting row ───────────────────────────────────────────────────
function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#1a1a1a] last:border-b-0">
      <div className="flex flex-col mr-4">
        <span className="text-sm font-medium text-white">{label}</span>
        {description && <span className="text-xs text-[#6b6b6b] mt-0.5">{description}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── General Section ────────────────────────────────────────────────────────
function GeneralSection() {
  const { startMinimized, minimizeToTray, language, updateSettings } = useSettingsStore();

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">General</h2>
      <SettingRow label="Start minimized" description="Launch Cadence in the system tray">
        <Toggle checked={startMinimized} onChange={(v) => updateSettings({ startMinimized: v })} />
      </SettingRow>
      <SettingRow label="Minimize to tray on close" description="Keep Cadence running when you close the window">
        <Toggle checked={minimizeToTray} onChange={(v) => updateSettings({ minimizeToTray: v })} />
      </SettingRow>
      <SettingRow label="Language">
        <select
          value={language}
          onChange={(e) => updateSettings({ language: e.target.value })}
          className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#7c3aed] focus:outline-none transition-colors appearance-none cursor-pointer"
        >
          <option value="en">English</option>
        </select>
      </SettingRow>
    </div>
  );
}

// ─── Library Section ────────────────────────────────────────────────────────
function LibrarySection() {
  const musicFolders = useSettingsStore((s) => s.musicFolders);
  const removeMusicFolder = useSettingsStore((s) => s.removeMusicFolder);
  const libraryStore = useLibraryStore();
  const [isClearing, setIsClearing] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);

  const handleAddFolder = async () => {
    try {
      const folderPath = await invoke<string | null>('open_folder_dialog');
      if (folderPath) {
        await libraryStore.addMusicFolder(folderPath);
      }
    } catch (err) {
      console.error('Failed to add folder:', err);
    }
  };

  const handleRescan = async () => {
    if (isRescanning || musicFolders.length === 0) return;
    setIsRescanning(true);
    try {
      for (const folder of musicFolders) {
        await libraryStore.scanFolder(folder);
      }
    } catch (err) {
      console.error('Rescan failed:', err);
    } finally {
      setIsRescanning(false);
    }
  };

  const handleClearLibrary = () => {
    setIsClearing(true);
  };

  const confirmClear = () => {
    libraryStore.setSongs([]);
    setIsClearing(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Library</h2>

      <div className="mb-6">
        <span className="text-sm font-medium text-[#a3a3a3] uppercase tracking-wider">Watched Folders</span>
        <div className="mt-3 flex flex-col gap-2">
          {musicFolders.length === 0 ? (
            <p className="text-sm text-[#6b6b6b] italic">No folders added yet.</p>
          ) : (
            musicFolders.map((folder) => (
              <div key={folder} className="flex items-center justify-between bg-[#1a1a1a] rounded-lg px-4 py-3 group">
                <span className="text-sm text-[#d4d4d4] truncate mr-4 font-mono">{folder}</span>
                <button
                  onClick={() => removeMusicFolder(folder)}
                  className="text-[#6b6b6b] hover:text-[#ef4444] transition-colors shrink-0"
                  title="Remove folder"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={handleAddFolder} className="flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors">
          <FolderPlus size={16} />
          Add Folder
        </button>
        <button
          onClick={handleRescan}
          disabled={isRescanning || musicFolders.length === 0}
          className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={isRescanning ? 'animate-spin' : ''} />
          {isRescanning ? 'Scanning...' : 'Rescan Library'}
        </button>
        <button
          onClick={handleClearLibrary}
          className="flex items-center gap-2 rounded-lg border border-[#ef4444]/30 px-4 py-2.5 text-sm font-medium text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
        >
          <Trash2 size={16} />
          Clear Library
        </button>
      </div>

      {/* Clear confirmation */}
      {isClearing && (
        <div className="mt-4 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 p-4">
          <p className="text-sm text-white mb-3">Are you sure? This will remove all songs from your library. Your music files won't be deleted.</p>
          <div className="flex gap-3">
            <button onClick={confirmClear} className="rounded-lg bg-[#ef4444] px-4 py-2 text-sm font-medium text-white hover:bg-[#dc2626] transition-colors">
              Yes, clear it
            </button>
            <button onClick={() => setIsClearing(false)} className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f1f1f] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Playback Section ───────────────────────────────────────────────────────
function PlaybackSection() {
  const { crossfadeEnabled, crossfadeDuration, updateSettings } = useSettingsStore();
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Playback</h2>
      <SettingRow label="Crossfade" description="Smoothly blend between tracks">
        <Toggle checked={crossfadeEnabled} onChange={(v) => updateSettings({ crossfadeEnabled: v })} />
      </SettingRow>
      {crossfadeEnabled && (
        <div className="pb-4 border-b border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#6b6b6b]">Crossfade Duration</span>
            <span className="text-xs text-[#a3a3a3] tabular-nums">{crossfadeDuration}s</span>
          </div>
          <input
            type="range"
            min={0} max={12} step={1}
            value={crossfadeDuration}
            onChange={(e) => updateSettings({ crossfadeDuration: Number(e.target.value) })}
            className="w-full accent-[#7c3aed] h-1 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#3a3a3a] mt-1">
            <span>0s</span><span>6s</span><span>12s</span>
          </div>
        </div>
      )}
      <div className="py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Default Volume</span>
          <span className="text-xs text-[#a3a3a3] tabular-nums">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0} max={100} step={1}
          value={Math.round(volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          className="w-full accent-[#7c3aed] h-1 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#3a3a3a] mt-1">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Appearance Section ─────────────────────────────────────────────────────
function AppearanceSection() {
  const theme = useUiStore((s) => s.theme);
  const accentColor = useUiStore((s) => s.accentColor);
  const setTheme = useUiStore((s) => s.setTheme);
  const setAccentColor = useUiStore((s) => s.setAccentColor);
  const { dynamicAccentColor, updateSettings } = useSettingsStore();
  const [customColor, setCustomColor] = useState(accentColor);

  const themes: { id: 'light' | 'dark' | 'system'; label: string; preview: { bg: string; sidebar: string; accent: string } }[] = [
    { id: 'dark', label: 'Dark', preview: { bg: '#0c0c0c', sidebar: '#111111', accent: '#7c3aed' } },
    { id: 'light', label: 'Light', preview: { bg: '#f5f5f5', sidebar: '#ffffff', accent: '#7c3aed' } },
    { id: 'system', label: 'System', preview: { bg: '#1a1a1a', sidebar: '#0c0c0c', accent: '#7c3aed' } },
  ];

  const handleAccentChange = (color: string) => {
    setCustomColor(color);
    setAccentColor(color);
    updateSettings({ accentColor: color });
    applyAccentColor(color);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Appearance</h2>

      <div className="mb-8">
        <span className="text-sm font-medium text-[#a3a3a3] uppercase tracking-wider mb-4 block">Theme</span>
        <div className="flex gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                updateSettings({ theme: t.id });
              }}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 border-2 transition-all duration-200 cursor-pointer ${
                theme === t.id ? 'border-[#7c3aed] bg-[#7c3aed]/5' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}
            >
              {/* Mini preview mockup */}
              <div className="w-24 h-16 rounded-lg overflow-hidden flex" style={{ backgroundColor: t.preview.bg }}>
                <div className="w-6 h-full" style={{ backgroundColor: t.preview.sidebar }} />
                <div className="flex-1 p-1.5">
                  <div className="w-full h-1.5 rounded-full mb-1" style={{ backgroundColor: t.preview.accent }} />
                  <div className="w-3/4 h-1 rounded-full mb-1 opacity-30" style={{ backgroundColor: theme === 'light' ? '#000' : '#fff' }} />
                  <div className="w-1/2 h-1 rounded-full opacity-20" style={{ backgroundColor: theme === 'light' ? '#000' : '#fff' }} />
                </div>
              </div>
              <span className={`text-xs font-medium ${theme === t.id ? 'text-[#a78bfa]' : 'text-[#6b6b6b]'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SettingRow label="Dynamic accent color" description="Match accent color to album art">
        <Toggle checked={dynamicAccentColor} onChange={(v) => updateSettings({ dynamicAccentColor: v })} />
      </SettingRow>

      {!dynamicAccentColor && (
        <div className="py-4">
          <span className="text-sm font-medium text-[#a3a3a3] mb-3 block">Accent Color</span>
          <div className="flex items-center gap-3">
            {ACCENT_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => handleAccentChange(color)}
                className="relative w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{ backgroundColor: color, boxShadow: accentColor === color ? `0 0 0 2px #0f0f0f, 0 0 0 4px ${color}` : 'none' }}
                title={color}
              >
                {accentColor === color && (
                  <Check size={14} className="absolute inset-0 m-auto text-white" />
                )}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => handleAccentChange(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomColor(v);
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) handleAccentChange(v);
                }}
                className="w-24 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-[#7c3aed] focus:outline-none transition-colors"
                placeholder="#7c3aed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Last.fm Section ────────────────────────────────────────────────────────
function LastFmSection() {
  const {
    lastFmEnabled, lastFmApiKey, lastFmApiSecret,
    lastFmUsername, lastFmSessionKey, updateSettings
  } = useSettingsStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle');
  const [authToken, setAuthToken] = useState('');
  const [authError, setAuthError] = useState('');

  const isConnected = !!lastFmSessionKey && !!lastFmUsername;

  const handleAuthenticate = async () => {
    if (!lastFmApiKey.trim()) {
      setAuthError('Please enter your API key first.');
      return;
    }
    setAuthError('');
    setAuthStatus('idle');

    try {
      const token = await invoke<string>('lastfm_get_token', { apiKey: lastFmApiKey });
      setAuthToken(token);

      const authUrl = `https://www.last.fm/api/auth/?api_key=${lastFmApiKey}&token=${token}`;
      
      // Try the shell plugin, fall back to window.open
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(authUrl);
      } catch {
        window.open(authUrl, '_blank');
      }

      setAuthStatus('waiting');
    } catch (err) {
      setAuthError(String(err));
      setAuthStatus('error');
    }
  };

  const handleContinueAuth = async () => {
    if (!authToken) return;
    try {
      const result = await invoke<{ success: boolean; session_key: string; username: string; error_message: string | null }>(
        'lastfm_get_session',
        { apiKey: lastFmApiKey, apiSecret: lastFmApiSecret, token: authToken }
      );
      if (result.success) {
        updateSettings({
          lastFmSessionKey: result.session_key,
          lastFmUsername: result.username,
        });
        setAuthStatus('success');
      } else {
        setAuthError(result.error_message || 'Authentication failed.');
        setAuthStatus('error');
      }
    } catch (err) {
      setAuthError(String(err));
      setAuthStatus('error');
    }
  };

  const handleDisconnect = () => {
    updateSettings({ lastFmSessionKey: '', lastFmUsername: '' });
    setAuthStatus('idle');
    setAuthToken('');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Last.fm</h2>
      <SettingRow label="Enable Last.fm scrobbling" description="Track your listening history on Last.fm">
        <Toggle checked={lastFmEnabled} onChange={(v) => updateSettings({ lastFmEnabled: v })} />
      </SettingRow>

      {lastFmEnabled && (
        <div className="mt-4 flex flex-col gap-4">
          {isConnected ? (
            <div className="flex items-center justify-between rounded-lg bg-[#16a34a]/10 border border-[#16a34a]/20 p-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-pulse" />
                <span className="text-sm text-white">Connected as <strong className="text-[#16a34a]">{lastFmUsername}</strong></span>
              </div>
              <button
                onClick={handleDisconnect}
                className="rounded-lg border border-[#ef4444]/30 px-3 py-1.5 text-xs font-medium text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#a3a3a3]">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={lastFmApiKey}
                    onChange={(e) => updateSettings({ lastFmApiKey: e.target.value })}
                    placeholder="Enter your Last.fm API key"
                    className="w-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-4 py-2.5 pr-10 text-sm text-white focus:border-[#7c3aed] focus:outline-none transition-colors"
                  />
                  <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-white transition-colors">
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#a3a3a3]">API Secret</label>
                <div className="relative">
                  <input
                    type={showApiSecret ? 'text' : 'password'}
                    value={lastFmApiSecret}
                    onChange={(e) => updateSettings({ lastFmApiSecret: e.target.value })}
                    placeholder="Enter your Last.fm API secret"
                    className="w-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-4 py-2.5 pr-10 text-sm text-white focus:border-[#7c3aed] focus:outline-none transition-colors"
                  />
                  <button onClick={() => setShowApiSecret(!showApiSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-white transition-colors">
                    {showApiSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {authStatus === 'waiting' ? (
                <div className="flex flex-col gap-3 rounded-lg border border-[#7c3aed]/30 bg-[#7c3aed]/5 p-4">
                  <p className="text-sm text-white">Please authorize Cadence on Last.fm, then click Continue.</p>
                  <button
                    onClick={handleContinueAuth}
                    className="self-start rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAuthenticate}
                  disabled={!lastFmApiKey.trim()}
                  className="self-start flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ExternalLink size={16} />
                  Authenticate
                </button>
              )}

              {authError && (
                <p className="text-xs text-[#ef4444]">{authError}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Discord Section ────────────────────────────────────────────────────────
function DiscordSection() {
  const { discordRpcEnabled, updateSettings } = useSettingsStore();
  const [connecting, setConnecting] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    updateSettings({ discordRpcEnabled: enabled });
    setConnecting(true);
    try {
      if (enabled) {
        await invoke('discord_connect');
      } else {
        await invoke('discord_disconnect');
      }
    } catch (err) {
      console.error('Discord RPC error:', err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Discord</h2>
      <SettingRow label="Enable Discord Rich Presence" description="Show what you're listening to on Discord">
        <Toggle checked={discordRpcEnabled} onChange={handleToggle} />
      </SettingRow>
      {discordRpcEnabled && (
        <div className="mt-2 flex items-center gap-2">
          {connecting ? (
            <span className="text-xs text-[#6b6b6b]">Connecting to Discord...</span>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#16a34a]" />
              <span className="text-xs text-[#6b6b6b]">Rich Presence active</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── About Section ──────────────────────────────────────────────────────────
function AboutSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">About</h2>

      <div className="flex flex-col items-center text-center mb-10 py-6">
        <img src="/logo.png" alt="Cadence Logo" className="w-24 h-24 object-contain mb-4 drop-shadow-[0_0_24px_rgba(232,99,10,0.25)]" />
        <h1 className="text-3xl font-bold text-white tracking-tight">Cadence</h1>
        <span className="text-sm text-[#6b6b6b] mt-1">Version 1.0.0</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-[#1a1a1a] p-4">
          <span className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider block mb-3">Built With</span>
          <div className="flex gap-3 flex-wrap">
            {['Tauri 2.0', 'React', 'Rust', 'TypeScript', 'Zustand'].map((tech) => (
              <span key={tech} className="rounded-full bg-[#2a2a2a] px-3 py-1 text-xs font-medium text-[#d4d4d4]">
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-[#1a1a1a] p-4">
          <span className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider block mb-3">Links</span>
          <div className="flex gap-3">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#a78bfa] hover:text-[#c4b5fd] transition-colors">
              <ExternalLink size={14} />
              GitHub
            </a>
            <a href="https://github.com/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#a78bfa] hover:text-[#c4b5fd] transition-colors">
              <ExternalLink size={14} />
              Report a Bug
            </a>
          </div>
        </div>

        <p className="text-xs text-[#3a3a3a] text-center mt-4">
          Made with ♥ — A premium desktop music experience.
        </p>
      </div>
    </div>
  );
}

// ─── Main Settings Page ─────────────────────────────────────────────────────
export default function Settings() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');

  const renderContent = () => {
    switch (activeCategory) {
      case 'general': return <GeneralSection />;
      case 'library': return <LibrarySection />;
      case 'playback': return <PlaybackSection />;
      case 'appearance': return <AppearanceSection />;
      case 'lastfm': return <LastFmSection />;
      case 'discord': return <DiscordSection />;
      case 'about': return <AboutSection />;
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0c0c0c] p-6 pb-32 overflow-hidden">
      {/* Left Nav */}
      <nav className="w-[200px] shrink-0 flex flex-col gap-1 mr-6 pt-2">
        <h1 className="text-xl font-bold text-white tracking-tight mb-4 px-3">Settings</h1>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left w-full ${
                isActive
                  ? 'bg-[#1a1a2e] text-[#a78bfa]'
                  : 'text-[#6b6b6b] hover:bg-[#161616] hover:text-white'
              }`}
            >
              <Icon size={18} />
              {cat.label}
            </button>
          );
        })}
      </nav>

      {/* Right Panel */}
      <div className="flex-1 bg-[#0f0f0f] rounded-2xl p-8 overflow-y-auto custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
}
