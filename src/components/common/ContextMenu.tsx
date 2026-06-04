// Cadence — Context menu component
// Renders a positioned dropdown menu, controlled by uiStore.contextMenu

import { useEffect, useRef } from 'react';
import { useUiStore } from '../../store/uiStore';

export default function ContextMenu() {
  const contextMenu = useUiStore((state) => state.contextMenu);
  const closeContextMenu = useUiStore((state) => state.closeContextMenu);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu, closeContextMenu]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  // TODO: Implement styled context menu items with icons and separators
  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      role="menu"
    >
      {contextMenu.items.map((item, index) =>
        item.separator ? (
          <div key={index} className="context-menu-separator" role="separator" />
        ) : (
          <button
            key={index}
            className="context-menu-item"
            disabled={item.disabled}
            onClick={() => {
              // TODO: Dispatch action based on item.action
              closeContextMenu();
            }}
            role="menuitem"
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
