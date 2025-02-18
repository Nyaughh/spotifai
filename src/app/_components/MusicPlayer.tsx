'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album?: {
    name: string;
    images: { url: string }[];
  };
  is_playing?: boolean;
  uri?: string;
  duration_ms?: number;
  progress_ms?: number;
}

interface SearchResults {
  tracks?: {
    items: Track[];
  };
}

interface PlayerState {
  is_playing: boolean;
  progress_ms: number;
  duration_ms: number;
  volume_percent: number;
}

export function MusicPlayer() {
  const { data: session, status } = useSession();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    is_playing: false,
    progress_ms: 0,
    duration_ms: 0,
    volume_percent: 50,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout>();

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const updateProgress = useCallback(() => {
    if (playerState.is_playing) {
      setPlayerState(prev => ({
        ...prev,
        progress_ms: Math.min(prev.progress_ms + 1000, prev.duration_ms),
      }));
    }
  }, [playerState.is_playing]);

  useEffect(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    progressInterval.current = setInterval(updateProgress, 1000);
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [updateProgress]);

  const fetchPlayerState = useCallback(async () => {
    if (status !== 'authenticated') return;

    try {
      const response = await fetch('/api/spotify/player-state');
      if (response.ok) {
        const data = await response.json();
        setPlayerState(prev => ({
          ...prev,
          is_playing: data.is_playing,
          progress_ms: data.progress_ms || 0,
          duration_ms: data.duration_ms || 0,
          volume_percent: data.volume_percent || prev.volume_percent,
        }));
      }
    } catch (error) {
      console.error('Error fetching player state:', error);
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchCurrentTrack = async () => {
      try {
        const response = await fetch('/api/spotify/current-track');
        if (response.ok) {
          const data = await response.json();
          setCurrentTrack(data);
          setPlayerState(prev => ({
            ...prev,
            is_playing: data.is_playing ?? false,
            duration_ms: data.duration_ms ?? 0,
          }));
        } else if (response.status === 404) {
          setCurrentTrack(null);
          setPlayerState(prev => ({ ...prev, is_playing: false }));
        }
      } catch (error) {
        console.error('Error fetching current track:', error);
        setCurrentTrack(null);
        setPlayerState(prev => ({ ...prev, is_playing: false }));
      }
    };

    // Initial fetch
    fetchCurrentTrack();
    fetchPlayerState();

    // Reduce polling frequency to reduce API load
    const trackInterval = setInterval(fetchCurrentTrack, 10000);
    const stateInterval = setInterval(fetchPlayerState, 10000);

    return () => {
      clearInterval(trackInterval);
      clearInterval(stateInterval);
    };
  }, [status, fetchPlayerState]);

  const handlePlayPause = async () => {
    if (status !== 'authenticated' || isLoading) return;

    try {
      setIsLoading(true);
      const endpoint = playerState.is_playing ? '/api/spotify/pause' : '/api/spotify/play';
      const response = await fetch(endpoint, { method: 'POST' });
      
      // Optimistically update UI
      setPlayerState(prev => ({ ...prev, is_playing: !prev.is_playing }));
      
      // If the request failed, revert the optimistic update
      if (!response.ok) {
        setPlayerState(prev => ({ ...prev, is_playing: !prev.is_playing }));
        console.error('Error controlling playback:', await response.text());
      }
    } catch (error) {
      // Revert optimistic update on error
      setPlayerState(prev => ({ ...prev, is_playing: !prev.is_playing }));
      console.error('Error controlling playback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeek = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerState.duration_ms || isLoading) return;

    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const seekMs = Math.floor(position * playerState.duration_ms);

    try {
      setIsLoading(true);
      const response = await fetch('/api/spotify/seek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_ms: seekMs }),
      });
      if (response.ok) {
        setPlayerState(prev => ({ ...prev, progress_ms: seekMs }));
      }
    } catch (error) {
      console.error('Error seeking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVolumeChange = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLoading) return;

    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const volume = Math.round(((e.clientX - rect.left) / rect.width) * 100);

    try {
      setIsLoading(true);
      const response = await fetch('/api/spotify/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume_percent: volume }),
      });
      if (response.ok) {
        setPlayerState(prev => ({ ...prev, volume_percent: volume }));
      }
    } catch (error) {
      console.error('Error setting volume:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async (direction: 'next' | 'previous') => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/spotify/${direction}`, { method: 'POST' });
      if (response.ok) {
        // Wait a bit for Spotify to update
        await new Promise(resolve => setTimeout(resolve, 500));
        // Fetch the new current track
        const trackResponse = await fetch('/api/spotify/current-track');
        if (trackResponse.ok) {
          const data = await trackResponse.json();
          setCurrentTrack(data);
          setPlayerState(prev => ({ ...prev, is_playing: data.is_playing ?? false }));
        }
      }
    } catch (error) {
      console.error('Error skipping track:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data: SearchResults = await response.json();
        setSearchResults(data.tracks?.items ?? []);
      }
    } catch (error) {
      console.error('Error searching tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const playTrack = async (uri: string) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/spotify/play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uri }),
      });
      if (response.ok) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        // Wait a bit for Spotify to update
        await new Promise(resolve => setTimeout(resolve, 500));
        // Fetch the new current track
        const trackResponse = await fetch('/api/spotify/current-track');
        if (trackResponse.ok) {
          const data = await trackResponse.json();
          setCurrentTrack(data);
          setPlayerState(prev => ({ ...prev, is_playing: data.is_playing ?? false }));
        }
      }
    } catch (error) {
      console.error('Error playing track:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status !== 'authenticated') return null;

  return (
    <>
      {/* Search Panel */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/95 p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for songs..."
                className="flex-1 rounded-full bg-white/10 px-4 py-2 text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-green-500"
                disabled={isLoading}
              />
              <button
                onClick={() => setShowSearch(false)}
                className="rounded-full bg-white/10 p-2 text-white"
                disabled={isLoading}
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-2">
              {searchResults.map((track) => (
                <div
                  key={track.id}
                  onClick={() => track.uri && playTrack(track.uri)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg bg-white/5 p-2 ${
                    isLoading ? 'opacity-50' : ''
                  }`}
                >
                  {track.album?.images?.[0]?.url && (
                    <Image
                      src={track.album.images[0].url}
                      alt={track.album.name ?? ''}
                      width={48}
                      height={48}
                      className="rounded-md"
                    />
                  )}
                  <div>
                    <div className="font-medium text-white">{track.name}</div>
                    <div className="text-sm text-white/60">
                      {track.artists?.map(a => a.name).join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          {/* Track Info */}
          <div className="flex min-w-[180px] items-center gap-4">
            {currentTrack?.album?.images?.[0]?.url ? (
              <div className="group relative h-14 w-14 overflow-hidden rounded-md">
                <Image
                  src={currentTrack.album.images[0].url}
                  alt={currentTrack.album?.name ?? 'Album Cover'}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                  <ExpandIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-white/10">
                <MusicIcon className="h-6 w-6 text-white/60" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-white">
                {currentTrack?.name ?? 'Not Playing'}
              </h3>
              <p className="truncate text-xs text-white/60">
                {currentTrack?.artists?.map(a => a.name).join(', ')}
              </p>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleSkip('previous')}
                className={`rounded-full p-2 text-white/80 ${
                  isLoading ? 'opacity-50' : ''
                }`}
                disabled={isLoading}
              >
                <PreviousIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={handlePlayPause}
                className={`rounded-full bg-white p-3 text-black ${
                  isLoading ? 'opacity-50' : ''
                }`}
                disabled={isLoading}
              >
                {playerState.is_playing ? (
                  <PauseIcon className="h-6 w-6" />
                ) : (
                  <PlayIcon className="h-6 w-6" />
                )}
              </button>

              <button
                onClick={() => handleSkip('next')}
                className={`rounded-full p-2 text-white/80 ${
                  isLoading ? 'opacity-50' : ''
                }`}
                disabled={isLoading}
              >
                <NextIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Time Progress */}
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span>{formatTime(playerState.progress_ms)}</span>
              <span>/</span>
              <span>{formatTime(playerState.duration_ms)}</span>
            </div>
          </div>

          {/* Volume & Additional Controls */}
          <div className="flex min-w-[180px] items-center justify-end gap-3">
            <button
              onClick={() => setShowSearch(true)}
              className={`rounded-full p-2 text-white/80 ${
                isLoading ? 'opacity-50' : ''
              }`}
              disabled={isLoading}
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            <div className="group flex items-center gap-2">
              <VolumeIcon className="h-5 w-5 text-white/80" />
              <div 
                className="h-1 w-24 cursor-pointer rounded-full bg-white/10"
                onClick={handleVolumeChange}
              >
                <div 
                  className="h-full rounded-full bg-white group-hover:bg-green-500"
                  style={{ width: `${playerState.volume_percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
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

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PreviousIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
    </svg>
  );
}

function NextIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M14.805 18.44c-1.25.713-2.805-.19-2.805-1.629v-2.34L5.055 18.44c-1.25.714-2.805-.188-2.805-1.628V8.688c0-1.44 1.555-2.342 2.805-1.628L12 11.03v-2.34c0-1.44 1.555-2.343 2.805-1.629l7.108 4.062c1.26.72 1.26 2.536 0 3.256l-7.108 4.061z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
      <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
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

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path fillRule="evenodd" d="M15 3.75a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V5.56l-3.97 3.97a.75.75 0 11-1.06-1.06l3.97-3.97h-2.69a.75.75 0 01-.75-.75zm-12 0A.75.75 0 013.75 3h4.5a.75.75 0 010 1.5H5.56l3.97 3.97a.75.75 0 01-1.06 1.06L4.5 5.56v2.69a.75.75 0 01-1.5 0v-4.5zm11.47 11.78a.75.75 0 111.06-1.06l3.97 3.97v-2.69a.75.75 0 011.5 0v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 010-1.5h2.69l-3.97-3.97zm-4.94-1.06a.75.75 0 010 1.06L5.56 19.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v2.69l3.97-3.97a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
  );
} 