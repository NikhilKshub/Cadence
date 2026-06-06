import { useUiStore } from '../../store/uiStore';
import Home from '../../pages/Home';
import Library from '../../pages/Library';
import Playlists from '../../pages/Playlists';
import NowPlaying from '../../pages/NowPlaying';
import Settings from '../../pages/Settings';
import Albums from '../../pages/Albums';
import Artists from '../../pages/Artists';
import LikedSongs from '../../pages/LikedSongs';



export default function MainContent() {
  const currentPage = useUiStore((state) => state.currentPage);

  return (
    <div className="flex-1 h-full bg-[#0c0c0c] overflow-y-auto border-t border-[#1f1f1f] custom-scrollbar relative">
      <div key={currentPage} className="animate-fade-in animate-slide-up w-full h-full">
        {currentPage === 'home' && <Home />}
        {currentPage === 'library' && <Library />}
        {currentPage === 'albums' && <Albums />}
        {currentPage === 'artists' && <Artists />}
        {currentPage === 'playlists' && <Playlists />}
        {currentPage === 'likedsongs' && <LikedSongs />}
        {currentPage === 'settings' && <Settings />}
        {currentPage === 'nowplaying' && <NowPlaying />}
      </div>
    </div>
  );
}
