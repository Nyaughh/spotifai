import { create } from 'zustand';

interface Track {
  uri: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
}

interface PlaylistState {
  currentPlaylist: string | null;
  currentTrack: Track | null;
  isPlaying: boolean;
  setCurrentPlaylist: (id: string | null) => void;
  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (playing: boolean) => void;
}

export const usePlaylistStore = create<PlaylistState>((set) => ({
  currentPlaylist: null,
  currentTrack: null,
  isPlaying: false,
  setCurrentPlaylist: (id) => set({ currentPlaylist: id }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
})); 