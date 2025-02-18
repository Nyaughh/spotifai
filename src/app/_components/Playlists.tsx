'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Track {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
}

interface Playlist {
  id: string;
  name: string;
  images: { url: string }[];
  owner: { display_name: string };
  tracks: {
    total: number;
  };
}

export function Playlists() {
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await fetch('/api/spotify/playlists');
        if (response.ok) {
          const data = await response.json();
          setPlaylists(data.items || []);
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchPlaylists();
    }
  }, [session]);

  useEffect(() => {
    const fetchPlaylistTracks = async () => {
      if (!selectedPlaylist) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/spotify/playlists/${selectedPlaylist}/tracks`);
        if (response.ok) {
          const data = await response.json();
          setPlaylistTracks(data.items.map((item: any) => item.track));
        }
      } catch (error) {
        console.error('Error fetching playlist tracks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistTracks();
  }, [selectedPlaylist]);

  const handlePlayTrack = async (uri: string) => {
    try {
      await fetch('/api/spotify/play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uri }),
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    try {
      await fetch('/api/spotify/play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
      });
    } catch (error) {
      console.error('Error playing playlist:', error);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const response = await fetch('/api/spotify/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newPlaylistName }),
      });

      if (response.ok) {
        // Refresh playlists
        const playlistsResponse = await fetch('/api/spotify/playlists');
        if (playlistsResponse.ok) {
          const data = await playlistsResponse.json();
          setPlaylists(data.items || []);
        }
        setNewPlaylistName('');
        setIsCreatingPlaylist(false);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const handleToggleLike = async (trackId: string) => {
    try {
      const response = await fetch(`/api/spotify/tracks/${trackId}/like`, {
        method: 'PUT',
      });
      if (response.ok) {
        // You might want to refresh the track list or update the UI here
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading && !selectedPlaylist) {
    return (
      <div className="h-full w-full animate-pulse bg-black/20">
        <div className="space-y-4 p-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-14 rounded-md bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Playlists Sidebar */}
      <div className="h-full w-80 flex-shrink-0 overflow-y-auto bg-black/40 backdrop-blur-lg">
        <div className="sticky top-0 z-10 bg-black/40 p-4 backdrop-blur-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Playlists</h2>
            <button
              onClick={() => setIsCreatingPlaylist(true)}
              className="group rounded-full bg-white/10 p-2 text-white transition-all hover:scale-105 hover:bg-white/20 active:scale-95"
            >
              <PlusIcon className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>
          </div>

          {/* Create Playlist Dialog */}
          {isCreatingPlaylist && (
            <div className="animate-in fade-in slide-in-from-top-4 space-y-2 rounded-xl bg-white/10 p-4 backdrop-blur-lg">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name"
                className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 outline-none ring-white/20 transition-all focus:ring-2"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsCreatingPlaylist(false);
                    setNewPlaylistName('');
                  }}
                  className="rounded-lg px-4 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black transition-all hover:scale-105 hover:bg-white/90 active:scale-95"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1 p-2">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              className={`group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-all hover:bg-white/10 ${
                selectedPlaylist === playlist.id ? 'bg-white/20' : ''
              }`}
              onClick={() => setSelectedPlaylist(playlist.id)}
            >
              {playlist.images?.[0]?.url ? (
                <div className="relative aspect-square h-10 w-10 overflow-hidden rounded-md">
                  <Image
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
                  <MusicIcon className="h-6 w-6 text-white/60" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{playlist.name}</p>
                <p className="truncate text-xs text-white/60">
                  By {playlist.owner?.display_name ?? 'Unknown'} • {playlist.tracks?.total ?? 0} tracks
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Playlist Content */}
      {selectedPlaylist && (
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-black/40 to-transparent backdrop-blur-lg">
          {loading ? (
            <div className="space-y-4 p-6">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="min-h-full p-6">
              {/* Playlist Header */}
              <div className="sticky top-0 z-10 -mx-6 mb-6 bg-black/40 px-6 py-4 backdrop-blur-lg">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    {playlists.find(p => p.id === selectedPlaylist)?.name}
                  </h2>
                  <button
                    onClick={() => handlePlayPlaylist(selectedPlaylist)}
                    className="group flex items-center gap-2 rounded-full bg-[#1DB954] px-6 py-2 font-medium text-black transition-all hover:scale-105 active:scale-95"
                  >
                    <PlayIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
                    Play
                  </button>
                </div>
              </div>

              {/* Tracks List */}
              <div className="space-y-1">
                {playlistTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="group relative flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-white/10"
                    onMouseEnter={() => setHoveredTrack(track.id)}
                    onMouseLeave={() => setHoveredTrack(null)}
                  >
                    {/* Track Number/Play Button */}
                    <div className="flex w-8 items-center justify-center text-sm text-white/60">
                      {hoveredTrack === track.id ? (
                        <button
                          onClick={() => handlePlayTrack(track.uri)}
                          className="rounded-full p-1 text-white transition-transform hover:scale-110 active:scale-95"
                        >
                          <PlayIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    {/* Album Art */}
                    <div className="relative aspect-square h-12 w-12 flex-shrink-0 overflow-hidden rounded-md">
                      {track.album?.images?.[0]?.url ? (
                        <Image
                          src={track.album.images[0].url}
                          alt={track.album.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/10">
                          <MusicIcon className="h-6 w-6 text-white/60" />
                        </div>
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{track.name}</p>
                          <p className="truncate text-sm text-white/60">
                            {track.artists.map(a => a.name).join(', ')}
                          </p>
                        </div>
                        <div className="ml-4 flex items-center gap-4">
                          <span className="text-sm text-white/60">
                            {formatDuration(track.duration_ms)}
                          </span>
                          <button
                            onClick={() => handleToggleLike(track.id)}
                            className="rounded-full p-2 text-white/60 opacity-0 transition-all hover:scale-110 hover:text-[#1DB954] group-hover:opacity-100 active:scale-95"
                          >
                            <HeartIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" clipRule="evenodd" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  );
} 