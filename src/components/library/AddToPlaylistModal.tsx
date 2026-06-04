import Modal from '../common/Modal';
import { useLibraryStore } from '../../store/libraryStore';
import type { Song } from '../../types/song';
import { Check, Plus, Minus, ListMusic } from 'lucide-react';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
}

export default function AddToPlaylistModal({ isOpen, onClose, song }: AddToPlaylistModalProps) {
  const playlists = useLibraryStore((state) => state.playlists);
  const addSongToPlaylist = useLibraryStore((state) => state.addSongToPlaylist);
  const removeSongFromPlaylist = useLibraryStore((state) => state.removeSongFromPlaylist);

  if (!song) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Playlist" className="w-[400px] max-w-[90vw]">
      <div className="flex flex-col max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <ListMusic size={40} className="text-[#2a2a2a] mb-4" />
            <p className="text-sm text-[#a3a3a3]">No playlists found.</p>
            <p className="text-xs text-[#6b6b6b] mt-1">Create one in the Playlists tab.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {playlists.map(playlist => {
              const isInPlaylist = playlist.songIds.includes(song.id);
              return (
                <div 
                  key={playlist.id} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1f1f1f] transition-colors group cursor-default"
                >
                  <div className="flex flex-col overflow-hidden mr-4">
                    <span className={`text-sm font-medium truncate ${isInPlaylist ? 'text-[#7c3aed]' : 'text-white'}`}>
                      {playlist.name}
                    </span>
                    <span className="text-xs text-[#6b6b6b] mt-0.5">{playlist.songCount} songs</span>
                  </div>
                  
                  {isInPlaylist ? (
                    <button 
                      onClick={() => removeSongFromPlaylist(playlist.id, song.id)}
                      className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#ef4444]/10 hover:text-[#ef4444] transition-colors text-xs font-medium"
                    >
                      <Check size={14} className="group-hover:hidden" />
                      <Minus size={14} className="hidden group-hover:block" />
                      <span className="group-hover:hidden w-10 text-center">Added</span>
                      <span className="hidden group-hover:block w-10 text-center">Remove</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => addSongToPlaylist(playlist.id, song.id)}
                      className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2a2a2a] text-white hover:bg-[#7c3aed] transition-colors text-xs font-medium"
                    >
                      <Plus size={14} />
                      <span className="w-10 text-center">Add</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
