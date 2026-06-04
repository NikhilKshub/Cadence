import { getCurrentWindow } from '@tauri-apps/api/window';

export default function TitleBar() {
  const appWindow = getCurrentWindow();

  return (
    <div 
      className="flex h-[38px] w-full shrink-0 items-center justify-between bg-[#0a0a0a] select-none"
      data-tauri-drag-region
    >
      {/* Left empty for balance or future use */}
      <div className="flex-1 pointer-events-none" data-tauri-drag-region></div>

      {/* Center - Title */}
      <div 
        className="flex-1 text-center text-xs font-medium text-[#a3a3a3] pointer-events-none"
        data-tauri-drag-region
      >
        Cadence
      </div>

      {/* Right - Window Controls */}
      <div className="flex flex-1 items-center justify-end px-3 gap-2 h-full">
        {/* Minimize (Left dot) */}
        <button
          onClick={() => appWindow.minimize()}
          className="h-3 w-3 rounded-full bg-[#3a3a3a] transition-colors duration-150 hover:bg-[#ffbd2e]"
          aria-label="Minimize"
        />
        {/* Maximize (Middle dot) */}
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="h-3 w-3 rounded-full bg-[#3a3a3a] transition-colors duration-150 hover:bg-[#28c840]"
          aria-label="Maximize"
        />
        {/* Close (Right dot) */}
        <button
          onClick={() => appWindow.close()}
          className="h-3 w-3 rounded-full bg-[#3a3a3a] transition-colors duration-150 hover:bg-[#ff5f57]"
          aria-label="Close"
        />
      </div>
    </div>
  );
}
